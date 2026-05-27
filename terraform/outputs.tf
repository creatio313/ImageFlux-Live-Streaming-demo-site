output "apprun_public_url" {
  description = "AppRun公開URL"
  value       = sakura_apprun_shared.imageflux_live_streaming_demo_api.public_url
}

output "webaccel_public_url" {
  description = "WebAccel公開URL"
  value       = sakura_webaccel.imageflux_live_streaming_demo_webaccel.subdomain
}

output "object_storage_access_key" {
  description = "バケットのアクセスキー"
  value       = nonsensitive(sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_rw_permission.access_key)
}

output "object_storage_secret_access_key" {
  description = "バケットのシークレットアクセスキー"
  value       = nonsensitive(sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_rw_permission.secret_key)
}