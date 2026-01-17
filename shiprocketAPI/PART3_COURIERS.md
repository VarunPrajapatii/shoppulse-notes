# Shiprocket API - Part 3: Couriers

## Table of Contents

- [Overview](#overview)
- [Courier IDs Reference](#courier-ids-reference)
- [Generate AWB for Shipment](#generate-awb-for-shipment)
- [List of Couriers](#list-of-couriers)
- [Check Courier Serviceability](#check-courier-serviceability)
- [Request for Shipment Pickup](#request-for-shipment-pickup)

---

## Overview

Use these APIs to assign AWB to your order, check for courier serviceability, and request for the pickup of your order.

---

## Courier IDs Reference

| COURIER ID | COURIER NAME |
|------------|--------------|
| 1 | Blue Dart |
| 4 | Amazon Shipping 5Kg |
| 6 | DTDC Surface |
| 10 | Delhivery |
| 14 | Ecom Express Surface |
| 18 | DTDC 5kg |
| 19 | Ecom Express Surface 2kg |
| 23 | Xpressbees 1kg |
| 24 | Xpressbees 2kg |
| 25 | Xpressbees 5kg |
| 29 | Amazon Shipping 1Kg |
| 32 | Amazon Shipping 2Kg |
| 33 | Xpressbees |
| 35 | Aramex International |
| 39 | Delhivery Surface 5 Kgs |
| 43 | Delhivery Surface |
| 45 | Ecom Express Reverse |
| 46 | Shadowfax Reverse |
| 48 | Ekart Logistics |
| 51 | Xpressbees Surface |
| 54 | Ekart Logistics Surface |
| 55 | Blue Dart Surface |
| 58 | Shadowfax Surface |
| 60 | Ecom Premium and ROS |
| 61 | Delhivery Reverse |
| 64 | Delhivery 500G Savex (A) |
| 65 | Delhivery 500G Savex (S) |
| 66 | Ecom Exp Savex (A) |
| 67 | Ecom ROS Savex (A) |
| 69 | Kerry Indev Express Surface |
| 71 | Self Delivery |
| 72 | Bluedart Savex (A) |
| 75 | SRF Standard 500gm |
| 76 | Delhivery 5KG Savex (S) |
| 77 | Delhivery 10KG Savex (S) |
| 78 | Delhivery 20KG Savex (S) |
| 79 | SRF Standard 2kg |
| 81 | SRF Standard |
| 82 | DTDC 2kg |
| 83 | Delhivery 500G Savex RVP |
| 84 | Delhivery 500G Savex RVP-QC |
| 85 | Standard |
| 86 | Express |
| 87 | Delhivery 5KG Savex RVP (S) |
| 88 | Delhivery 10KG Savex RVP (S) |
| 89 | Delhivery 20KG Savex RVP (S) |
| 90 | Standard 500gm |
| 91 | Standard 2kg |
| 92 | Standard 5kg |
| 93 | Standard 10kg |
| 94 | Standard 20kg |
| 95 | Shadowfax Local |
| 97 | Dunzo Local |
| 98 | SRF Standard 5kg |
| 99 | Ecom Express ROS Reverse |
| 100 | Delhivery Surface 10 Kgs |
| 101 | Delhivery Surface 20 Kgs |
| 106 | Borzo |
| 107 | Borzo 5 Kg |
| 114 | SRF Standard 10kg |
| 115 | Shadowfax Savex |
| 116 | SRF Standard 20kg |
| 117 | SRF Express |
| 118 | Bluedart Savex Exchange |
| 119 | Identify Plus SDD Lite |
| 120 | Identify Plus SDD Standard |
| 125 | Xpressbees Reverse |
| 126 | Bluedart Savex TDD |
| 130 | Ekart 10kg |
| 138 | Delhivery Reverse 5kg |
| 140 | SRX Premium |
| 141 | SRF RUSH |
| 142 | Amazon Surface 500gm Prepaid |
| 144 | Xpressbees Reverse 2kg |
| 145 | Xpressbees Reverse 5 kg |
| 146 | Kerry Indev 2kg Surface |
| 150 | Xpressbees Reverse 1kg |
| 154 | Kerry Indev Express |
| 159 | Xpressbees 10kg |
| 170 | Ekart 2Kg |
| 171 | Ekart 5Kg |
| 181 | Amazon Shipping 10Kg |
| 182 | Amazon Shipping 20Kg |
| 195 | Amazon Surface 500gm COD |
| 196 | DTDC 500GMS |
| 235 | DTDC Express |
| 240 | SRX Priority |
| 313 | Wholemark |
| 501 | Bluedart CE Savex |
| 524 | Sm Shadowfax Surface 3Kg |
| 777 | Shadowfax DS |

---

## Generate AWB for Shipment

Assign the AWB (Air Waybill Number) to your shipment. The AWB is a unique number that helps you track the shipment and get details about it.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/courier/assign/awb
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `shipment_id` | YES | integer | The shipment id of the order you want to create the AWB for. | 16016920 |
| `courier_id` | NO | integer | The courier id of the courier service you want to select. The default courier is selected in case no id is specified. | 10 |
| `status` | NO | string | Use this to change the courier of a shipment. Value: reassign. Note that this can be done only once in 24 hours. | reassign |

### Request Body

```json
{
  "shipment_id": "",
  "courier_id": "",
  "status": ""
}
```

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "shipment_id": "16090281",
    "courier_id": "10"
}'
```

### Response (200 OK)

```json
{
  "awb_assign_status": 1,
  "response": {
    "data": {
      "courier_company_id": 142,
      "awb_code": "321055706540",
      "cod": 0,
      "order_id": 281248157,
      "shipment_id": 16090281,
      "awb_code_status": 1,
      "assigned_date_time": {
        "date": "2022-11-25 11:17:52.878599",
        "timezone_type": 3,
        "timezone": "Asia/Kolkata"
      },
      "applied_weight": 0.5,
      "company_id": 25149,
      "courier_name": "Amazon Surface",
      "child_courier_name": null,
      "pickup_scheduled_date": "2022-11-25 14:00:00",
      "routing_code": "",
      "rto_routing_code": "",
      "invoice_no": "retail5769122647118",
      "transporter_id": "",
      "transporter_name": "",
      "shipped_by": {
        "shipper_company_name": "manoj",
        "shipper_address_1": "Aligarh",
        "shipper_address_2": "noida",
        "shipper_city": "Jammu",
        "shipper_state": "Jammu & Kashmir",
        "shipper_country": "India",
        "shipper_postcode": "110030",
        "shipper_first_mile_activated": 0,
        "shipper_phone": "8976967989",
        "lat": "32.731899",
        "long": "74.860376",
        "shipper_email": "hdhd@gshd.com",
        "rto_company_name": "test",
        "rto_address_1": "Unnamed Road, Bengaluru, Karnataka 560060, India",
        "rto_address_2": "Katrabrahmpur",
        "rto_city": "Bangalore",
        "rto_state": "Karnataka",
        "rto_country": "India",
        "rto_postcode": "560060",
        "rto_phone": "9999999999",
        "rto_email": "test@test.com"
      }
    }
  }
}
```

---

## List of Couriers

Check the list of couriers and the related information with Shiprocket based on the search criteria.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/courier/courierListWithCounts
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Notes

- This API will work on a company level.
- You can use filters to sort your data. By default, all the couriers are shown if no filter is used.
- `total_courier_count` will change based on the filter used.

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `type` | NO | string | Use this as a parameter. Possible values are: active/inactive/all | `?type=active` |

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/courierListWithCounts' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Response (200 OK)

```json
{
  "total_courier_count": 72,
  "serviceable_pincodes_count": 26416,
  "pickup_pincodes_count": 25501,
  "total_rto_count": 3380,
  "total_oda_count": 2032,
  "courier_count": 12,
  "courier_data": [
    {
      "is_own_key_courier": 0,
      "ownkey_courier_id": 0,
      "id": 53,
      "min_weight": 1,
      "base_courier_id": 53,
      "name": "Gati Surface 1 Kg",
      "use_sr_postcodes": 1,
      "type": 1,
      "status": 1,
      "courier_type": 0,
      "master_company": "Gati Surface 1 Kg",
      "service_type": 1,
      "mode": 0,
      "image": {
        "logo": "post_order/img/courier/GATI-SURFACE.png",
        "small_logo": "post_order/img/courier/thumb/gati.jpg",
        "email_logo_s3_path": "gati.png"
      },
      "realtime_tracking": "Real Time",
      "delivery_boy_contact": "Not Available",
      "pod_available": "On Request",
      "call_before_delivery": "Available",
      "activated_date": "2021-10-14",
      "newest_date": null,
      "shipment_count": "",
      "is_hyperlocal": 0
    }
  ]
}
```

---

## Check Courier Serviceability

Check the availability of couriers between the pickup and delivery postal codes. Further details like the estimated time of delivery, the rates along with the ids are also shown.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/courier/serviceability/
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Notes

- One of either the `order_id` or `cod` and `weight` is required. If you specify the order id, the cod and weight fields are not required and vice versa.
- You can add further fields to add the shipment details and filter the search.

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `pickup_postcode` | YES | integer | Postcode from where the order will be picked. | 110030 |
| `delivery_postcode` | YES | integer | Postcode where the order will be delivered | 122002 |
| `order_id` | NO | integer | If order id is already created in Shiprocket panel then you can use this shiprocket order id in servicibility | 123456 |
| `cod` | CONDITIONAL YES | boolean | 1 for Cash on Delivery and 0 for Prepaid orders. | 1 |
| `weight` | CONDITIONAL YES | string | The weight of shipment in kgs. | 2 |
| `length` | NO | integer | The length of the shipment in cms. | 15 |
| `breadth` | NO | integer | The breadth of the shipment in cms. | 10 |
| `height` | NO | integer | The height of the shipment in cms. | 5 |
| `declared_value` | NO | integer | The price of the order shipment in rupees. | 50 |
| `mode` | NO | string | The mode of travel. Either: Surface or Air | Air |
| `is_return` | NO | integer | Whether the order is a return order or not. 1 in case of Yes and 0 for No. (declared_value field is required in case you use this parameter) | 0 |
| `couriers_type` | NO | integer | Use this to filter out and show only "documents" couriers like XB documents, etc. The only accepted value is 1. | 1 |
| `only_local` | NO | integer | Use this to filter out and show only Hyperlocal couriers. The only accepted value is 1. | 1 |
| `qc_check` | CONDITIONAL YES | integer | Use this filter to show only the QC-enabled couriers. is_return has to be set to 1 | 1 |

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=110030&delivery_postcode=175019&cod=1&weight=0.5' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Response (200 OK)

```json
{
  "company_auto_shipment_insurance_setting": true,
  "covid_zones": {
    "delivery_zone": null,
    "pickup_zone": null
  },
  "currency": "INR",
  "data": {
    "available_courier_companies": [
      {
        "air_max_weight": "0.00",
        "assured_amount": 0,
        "base_courier_id": null,
        "base_weight": "",
        "blocked": 0,
        "call_before_delivery": "Available",
        "charge_weight": 0.5,
        "city": "Mandi",
        "cod": 1,
        "cod_charges": 0,
        "cod_multiplier": 0.01,
        "cost": "",
        "courier_company_id": 43,
        "courier_name": "Delhivery Surface",
        "courier_type": "0",
        "coverage_charges": 0,
        "cutoff_time": "11:00",
        "delivery_boy_contact": "Not Available",
        "delivery_performance": 5,
        "description": "",
        "edd": "",
        "entry_tax": 0,
        "estimated_delivery_days": "4",
        "etd": "Jul 01, 2024",
        "etd_hours": 91,
        "freight_charge": 54,
        "id": 459245934,
        "is_custom_rate": 1,
        "is_hyperlocal": false,
        "is_international": 0,
        "is_rto_address_available": true,
        "is_surface": true,
        "local_region": 0,
        "metro": 0,
        "min_weight": 0.5,
        "mode": 0,
        "odablock": false,
        "other_charges": 0,
        "pickup_availability": "0",
        "pickup_performance": 4.7,
        "pod_available": "Instant",
        "postcode": "175019",
        "qc_courier": 0,
        "rate": 54,
        "rating": 4.9,
        "realtime_tracking": "Real Time",
        "region": 1,
        "rto_charges": 54,
        "rto_performance": 5,
        "state": "Himachal Pradesh",
        "surface_max_weight": "4.00",
        "tracking_performance": 5,
        "zone": "z_e"
      }
    ],
    "blocked_courier_companies": [
      {
        "block_reason": "Operational Issues",
        "courier_company_id": 33,
        "courier_name": "Xpressbees Air",
        "postcode": "175019"
      }
    ],
    "child_courier_id": null,
    "is_recommendation_enabled": 1,
    "recommendation_advance_rule": 0,
    "recommended_by": {
      "id": 6,
      "title": "Recommendation By Shiprocket"
    },
    "recommended_courier_company_id": 43,
    "shiprocket_recommended_courier_id": 43
  },
  "dg_courier": 0,
  "eligible_for_insurance": false,
  "is_allow_templatized_pricing": true,
  "status": 200
}
```

---

## Request for Shipment Pickup

Create a pickup request for your order shipment. The API returns the pickup status along with the estimated pickup time. You will have to call the 'Generate Manifest' API after the successful response of this API.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/courier/generate/pickup
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Notes

- The AWB must be already generated for the shipment id to generate the pickup request.
- Only one shipment_id can be passed at a time.
- In case the pickup_date falls on a holiday or Sunday, the shipment will be booked for the next available date.

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `shipment_id` | YES | integer | The shipment id of the shipment which is requested for pickup. | [16090109] |
| `status` | NO | string | Use this field to retry if the pickup request fails. Value: retry | retry |
| `pickup_date` | NO | Array of Dates | Use this field to schedule a pickup for a future date. The date format would be YYYY-MM-DD. You can reschedule the date till that date has not passed | ["2022-06-04"] |

### Request Body

```json
{
  "shipment_id": [16090109]
}
```

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "shipment_id": [16091084]
}'
```

### Response (200 OK)

```json
{
  "pickup_status": 1,
  "response": {
    "pickup_scheduled_date": "2021-12-10 12:39:54",
    "pickup_token_number": "Reference No: 194_BIGFOOT 1966840_11122021",
    "status": 3,
    "pickup_generated_date": {
      "date": "2021-12-10 12:39:54.034695",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "data": "Pickup is confirmed by Xpressbees 1kg For AWB :- 143254213727423"
  }
}
```
