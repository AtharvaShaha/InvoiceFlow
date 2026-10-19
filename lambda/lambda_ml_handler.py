"""
AWS Lambda handler for InvoiceFlow's lightweight rule-based anomaly detector.

Default handler: lambda_ml_handler.lambda_handler

Supported invocation forms:
- Direct Lambda test: {"invoice_id": "..."} or {"action": "analyze_all"}
- API Gateway route: POST /invoices/{invoiceId}/analyze
- Optional DynamoDB Streams: set handler to lambda_ml_handler.handle_stream
"""
import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

from ml_anomaly_detector import analyze_invoice, analyze_all_invoices, MODEL_VERSION

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "InvoiceRecords")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _to_dynamo(value):
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, list):
        return [_to_dynamo(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_dynamo(item) for key, item in value.items()}
    return value


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": json.dumps(body, default=_json_default),
    }


def _all_invoices():
    items, kwargs = [], {}
    while True:
        result = table.scan(**kwargs)
        items.extend(result.get("Items", []))
        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            break
        kwargs["ExclusiveStartKey"] = last_key
    return items


def _write_result(invoice_id, prediction):
    # Explicit aliases avoid using expression placeholders as attribute names.
    names = {
        "#score": "anomaly_score",
        "#risk": "risk_level",
        "#anomaly": "is_anomaly",
        "#reasons": "anomaly_reasons",
        "#version": "model_version",
        "#status": "prediction_status",
        "#analyzed": "analyzed_at",
    }
    values = {
        ":score": _to_dynamo(prediction.get("anomaly_score")),
        ":risk": prediction.get("risk_level"),
        ":anomaly": prediction.get("is_anomaly", False),
        ":reasons": _to_dynamo(prediction.get("anomaly_reasons", [])),
        ":version": prediction.get("model_version", MODEL_VERSION),
        ":status": prediction.get("prediction_status", "failed"),
        ":analyzed": prediction.get("analyzed_at"),
    }

    set_parts, remove_parts, used_values = [], [], {}
    for alias, value_key in zip(
        ("#score", "#risk", "#anomaly", "#reasons", "#version", "#status", "#analyzed"),
        (":score", ":risk", ":anomaly", ":reasons", ":version", ":status", ":analyzed"),
    ):
        value = values[value_key]
        if value is None:
            remove_parts.append(alias)
        else:
            set_parts.append(f"{alias} = {value_key}")
            used_values[value_key] = value

    expression_parts = []
    if set_parts:
        expression_parts.append("SET " + ", ".join(set_parts))
    if remove_parts:
        expression_parts.append("REMOVE " + ", ".join(remove_parts))

    kwargs = {
        "Key": {"invoice_id": invoice_id},
        "UpdateExpression": " ".join(expression_parts),
        "ExpressionAttributeNames": names,
    }
    if used_values:
        kwargs["ExpressionAttributeValues"] = used_values
    table.update_item(**kwargs)


def _analyse_one(invoice_id):
    result = table.get_item(Key={"invoice_id": invoice_id})
    invoice = result.get("Item")
    if not invoice:
        return None, _response(404, {"message": f"Invoice {invoice_id} not found"})

    invoices = _all_invoices()
    prediction = analyze_invoice(dict(invoice), [dict(item) for item in invoices])
    _write_result(invoice_id, prediction)
    return prediction, None


def _analyze_single(event):
    path_params = event.get("pathParameters") or {}
    invoice_id = (
        path_params.get("invoiceId")
        or path_params.get("invoice_id")
        or path_params.get("id")
        or event.get("invoice_id")
    )
    if not invoice_id:
        return _response(400, {"message": "Provide invoice_id or a matching path parameter."})
    prediction, error_response = _analyse_one(str(invoice_id))
    if error_response:
        return error_response
    return _response(200, {"invoice_id": str(invoice_id), **prediction})


def _analyze_batch():
    invoices = _all_invoices()
    predictions = analyze_all_invoices([dict(item) for item in invoices])
    success, errors = 0, 0
    for invoice_id, prediction in predictions.items():
        try:
            _write_result(invoice_id, prediction)
            success += 1
        except Exception:
            logger.exception("Failed to write analysis for invoice_id=%s", invoice_id)
            errors += 1
    return _response(200, {
        "total": len(predictions),
        "success": success,
        "errors": errors,
        "model_version": MODEL_VERSION,
        "detector_type": "rule_based",
    })


def lambda_handler(event, context):
    """Default Lambda entry point for direct tests and API Gateway."""
    try:
        if not isinstance(event, dict):
            return _response(400, {"message": "Event must be a JSON object."})

        # API Gateway HTTP API v2 route or REST API path.
        route_key = str(event.get("routeKey", ""))
        raw_path = str(event.get("rawPath") or event.get("path") or "")
        method = (
            event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("httpMethod")
            or ""
        ).upper()

        if method == "OPTIONS":
            return _response(200, {"message": "OK"})

        if event.get("action") == "analyze_all" or raw_path.rstrip("/").endswith("/analyze-all"):
            return _analyze_batch()

        if event.get("invoice_id") or event.get("pathParameters") or "/analyze" in route_key or raw_path.endswith("/analyze"):
            return _analyze_single(event)

        # A direct test with an invoice-shaped object is analyzed without database lookup,
        # but it is not written to DynamoDB unless invoice_id exists and a DB record exists.
        if "total_amount" in event or "invoice_number" in event:
            prediction = analyze_invoice(event, _all_invoices())
            return _response(200, {"invoice_id": event.get("invoice_id"), **prediction})

        return _response(400, {
            "message": "Unsupported event. Use invoice_id to analyze a stored invoice, or action=analyze_all."
        })
    except ClientError:
        logger.exception("DynamoDB operation failed")
        return _response(500, {"message": "DynamoDB operation failed. Check Lambda IAM permissions and CloudWatch logs."})
    except Exception:
        logger.exception("Unexpected analysis error")
        return _response(500, {"message": "Analysis failed. Check CloudWatch logs."})


def handle_stream(event, context):
    """Optional stream handler; use only after configuring safe event filtering."""
    from boto3.dynamodb.types import TypeDeserializer
    deserializer = TypeDeserializer()
    try:
        for record in event.get("Records", []):
            if record.get("eventName") != "INSERT":
                continue
            image = record.get("dynamodb", {}).get("NewImage", {})
            if not image:
                continue
            invoice = {key: deserializer.deserialize(value) for key, value in image.items()}
            invoice_id = invoice.get("invoice_id")
            if not invoice_id or str(invoice.get("status", "")).lower() in ("processing", "failed"):
                continue
            if invoice.get("prediction_status") == "completed":
                continue
            invoices = _all_invoices()
            prediction = analyze_invoice(dict(invoice), [dict(item) for item in invoices])
            _write_result(str(invoice_id), prediction)
    except Exception:
        logger.exception("DynamoDB stream processing failed")
        raise
