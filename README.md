
cd functions
npm install -save body-parser cors express moment-timezone promise-mysql


gcloud beta scheduler jobs create pubsub store_rail_info_JOB \
  --topic store_rail_info \
  --message-body='test' \
  --schedule '*/15 * * * *' \
  --time-zone='Asia/Tokyo'


gcloud beta scheduler jobs create pubsub check_rail_info_JOB \
  --topic check_rail_info \
  --message-body='test' \
  --schedule '*/15 * * * *' \
  --time-zone='Asia/Tokyo'