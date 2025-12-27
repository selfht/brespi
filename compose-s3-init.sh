#!/bin/bash

bucket="bucko"

curl -X PUT "http://localhost:4566/$bucket"
echo "S3 bucket '$bucket' created successfully"
