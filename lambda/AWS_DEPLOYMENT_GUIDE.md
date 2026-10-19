# InvoiceFlow — AWS ML Deployment Guide (Step-by-Step)

This guide walks you through deploying the ML Anomaly Detection Lambda function in the **AWS Management Console**. No complex CLI commands or expensive services (like Amazon SageMaker) are required. The solution uses standard Python 3.11 on AWS Lambda and your existing DynamoDB table `InvoiceRecords`.

---

## 1. Prerequisites Check
Before starting, verify you have:
1. An existing DynamoDB table named **`InvoiceRecords`** (or your custom name).
2. The code in the [`lambda/`](file:///d:/Project/invoice-dashboard%20-%20Working%20-%20Copy/lambda) folder:
   - [`ml_anomaly_detector.py`](file:///d:/Project/invoice-dashboard%20-%20Working%20-%20Copy/lambda/ml_anomaly_detector.py)
   - [`lambda_ml_handler.py`](file:///d:/Project/invoice-dashboard%20-%20Working%20-%20Copy/lambda/lambda_ml_handler.py)
   - [`requirements.txt`](file:///d:/Project/invoice-dashboard%20-%20Working%20-%20Copy/lambda/requirements.txt)

---

## 2. Package the Lambda Code
Since this module only uses Python standard libraries (`math`, `datetime`, `json`, `os`, `logging`, `decimal`) and AWS built-in `boto3`, **no external pip packages need to be compiled**!

1. Open File Explorer to your project's `lambda` directory.
2. Select:
   - `ml_anomaly_detector.py`
   - `lambda_ml_handler.py`
3. Right-click and choose **Send to > Compressed (zipped) folder** (or use any ZIP tool).
4. Name the archive **`invoiceflow-ml.zip`**.

---

## 3. Create the Lambda Function in AWS Console
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **Lambda** and select it.
3. Click the orange **Create function** button.
4. Choose **Author from scratch**.
5. Configure the basic information:
   - **Function name**: `InvoiceFlow-ML-AnomalyDetector`
   - **Runtime**: `Python 3.11` (or Python 3.12)
   - **Architecture**: `x86_64`
6. Click **Create function**.

---

## 4. Upload the Code & Configure Handler
1. In the function's **Code** tab:
   - Click the **Upload from** dropdown on the right and select **.zip file**.
   - Select your `invoiceflow-ml.zip` file and click **Save**.
2. Scroll down to **Runtime settings**:
   - Click **Edit**.
   - Change **Handler** from `lambda_function.lambda_handler` to:
     ```text
     lambda_ml_handler.lambda_handler
     ```
   - Click **Save**.

---

## 5. Set Environment Variables
1. Click the **Configuration** tab.
2. Select **Environment variables** on the left menu.
3. Click **Edit**, then **Add environment variable**:
   - **Key**: `TABLE_NAME`
   - **Value**: `InvoiceRecords` (use your actual DynamoDB table name)
4. Click **Save**.

---

## 6. Adjust Timeout & Memory
1. In the **Configuration** tab, select **General configuration**.
2. Click **Edit**.
   - **Memory**: `256 MB` (very lightweight; cost remains near $0.00)
   - **Timeout**: `30 seconds` (allows batch scanning if needed)
3. Click **Save**.

---

## 7. Grant DynamoDB Permissions (IAM Role)
Your Lambda needs read and write access to the DynamoDB table to read invoice data and write the ML fields.

1. In the **Configuration** tab, select **Permissions**.
2. Under **Execution role**, click the role name link (opens AWS IAM in a new tab).
3. In IAM, click **Add permissions > Create inline policy**.
4. Select the **JSON** editor and paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:Scan",
           "dynamodb:Query"
         ],
         "Resource": "arn:aws:dynamodb:*:*:table/InvoiceRecords"
       }
     ]
   }
   ```
5. Click **Next**, name the policy `InvoiceFlow-DynamoDB-MLAccess`, and click **Create policy**.

---

## 8. Choose How the Lambda Triggers (Choose Option A or B)

### Option A: Automatic Trigger via DynamoDB Streams (Recommended)
This analyzes every invoice as soon as Textract finishes writing it to DynamoDB.
1. Go to DynamoDB in AWS Console > **Tables** > **`InvoiceRecords`**.
2. Select the **Exports and streams** tab.
3. In **DynamoDB stream details**, click **Turn on**.
4. Select **New and old images** and click **Turn on stream**.
5. Return to your Lambda function > **Configuration** > **Triggers**.
6. Click **Add trigger**:
   - Source: **DynamoDB**
   - DynamoDB table: `InvoiceRecords`
   - Batch size: `10`
   - Starting position: `Latest`
7. Click **Add**.

### Option B: Trigger via API Gateway (On-Demand / Manual Analysis)
If you want to trigger ML analysis on demand or via your backend API:
1. In the Lambda function overview, click **Add trigger**.
2. Select **API Gateway**.
3. Create a new REST API or HTTP API with endpoint `POST /invoices/{invoice_id}/analyze`.
4. Deploy the API and copy the API endpoint URL into your frontend `.env` as `VITE_API_BASE_URL`.

---

## 9. Test the Function in the Console
1. In the Lambda function, click the **Test** tab.
2. Select **Create new event**, name it `TestAnalyzeEvent`.
3. Paste a test payload:
   ```json
   {
     "invoice_id": "INV-2026-001",
     "invoice_number": "INV-2026-001",
     "customer_name": "Acme Corp",
     "platform_fee": 1000.0,
     "cgst": 90.0,
     "sgst": 90.0,
     "total_amount": 1180.0,
     "status": "processed"
   }
   ```
4. Click **Test**.
5. You should see a `200 OK` response with:
   ```json
   {
     "invoice_id": "INV-2026-001",
     "anomaly_score": 0,
     "risk_level": "Low",
     "is_anomaly": false,
     "anomaly_reasons": [],
     "model_version": "invoiceflow-rf-v1.0.0",
     "prediction_status": "completed"
   }
   ```
