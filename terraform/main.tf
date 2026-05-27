data "sakura_object_storage_site" "ishikari" {
  display_name = "石狩第1サイト"
}

resource "sakura_apprun_shared" "imageflux_live_streaming_demo_api" {
  name = "ImageFlux Live StreamingデモサイトのAPI"

  max_scale       = 3
  min_scale       = 1
  port            = 8080
  timeout_seconds = 60

  components = [{
    name       = "ImageFlux Live StreamingデモサイトのAPIコンテナ"
    max_cpu    = "0.5"
    max_memory = "1Gi"
    deploy_source = {
      container_registry = {
        image  = var.container_registry_image
      }
    }
    env = [{
      key   = "ALLOWED_ORIGINS"
      value = join("", ["https://", sakura_webaccel.imageflux_live_streaming_demo_webaccel.subdomain])
    }]
    probe = {
      http_get = {
        path = "/health"
        port = 8080
      }
    }
  }]
  traffics = [{
    version_index = 0
    percent       = 100
  }]
}

resource "sakura_object_storage_bucket" "imageflux_live_streaming_demo_bucket" {
  name    = "imageflux-live-streaming-demo-site"
  site_id = data.sakura_object_storage_site.ishikari.id
}

resource "sakura_object_storage_permission" "imageflux_live_streaming_demo_bucket_r_permission" {
  name = "ImageFlux Live StreamingデモサイトのバケットRead権限"
  bucket_controls = [{
    bucket    = sakura_object_storage_bucket.imageflux_live_streaming_demo_bucket.name
    can_read  = true
    can_write = false
  }]
  site_id = data.sakura_object_storage_site.ishikari.id
}

resource "sakura_object_storage_permission" "imageflux_live_streaming_demo_bucket_rw_permission" {
  name = "ImageFlux Live StreamingデモサイトのバケットReadWrite権限"
  bucket_controls = [{
    bucket    = sakura_object_storage_bucket.imageflux_live_streaming_demo_bucket.name
    can_read  = true
    can_write = true
  }]
  site_id = data.sakura_object_storage_site.ishikari.id
}

resource "sakura_object_storage_bucket_versioning" "imageflux_live_streaming_demo_bucket_versioning" {
  bucket     = sakura_object_storage_bucket.imageflux_live_streaming_demo_bucket.name
  access_key = sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_rw_permission.access_key
  secret_key = sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_rw_permission.secret_key
  versioning_configuration = {
    status = "Enabled"
  }
}

resource "sakura_webaccel" "imageflux_live_streaming_demo_webaccel" {
  name             = "ImageFlux Live StreamingデモサイトのWebページ"
  domain_type      = "subdomain"
  request_protocol = "https-redirect"
  origin_parameters = {
    type                   = "bucket"
    access_key_wo          = sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_r_permission.access_key
    secret_access_key_wo   = sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_r_permission.secret_key
    bucket_name            = sakura_object_storage_bucket.imageflux_live_streaming_demo_bucket.name
    credentials_wo_version = 1
    use_document_index     = true
    endpoint = join("", ["s3.", data.sakura_object_storage_site.ishikari.endpoint])
    region   = data.sakura_object_storage_site.ishikari.region
  }
  
  logging = {
    enabled                = true
    bucket_name            = sakura_object_storage_bucket.imageflux_live_streaming_demo_bucket.name
    access_key_wo          = sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_rw_permission.access_key
    secret_access_key_wo   = sakura_object_storage_permission.imageflux_live_streaming_demo_bucket_rw_permission.secret_key
    credentials_wo_version = 1
    endpoint = join("", ["s3.", data.sakura_object_storage_site.ishikari.endpoint])
    region   = data.sakura_object_storage_site.ishikari.region
  }
  default_cache_ttl = 334
  normalize_ae      = "gzip"
}
resource "sakura_webaccel_activation" "imageflux_live_streaming_demo_webaccel_activation" {
  site_id = sakura_webaccel.imageflux_live_streaming_demo_webaccel.id
  enabled = true
}