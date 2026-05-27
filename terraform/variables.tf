variable "access_token" {
  type        = string
  description = "Access token of the project."
  sensitive   = true
}
variable "access_token_secret" {
  type        = string
  description = "Access token secret of the project"
  sensitive   = true
}
variable "zone" {
  type        = string
  description = "Zone to build resources."
  default     = "is1c"
}
variable "container_registry_image" {
  type        = string
  description = "Container registry image."
  default     = "creatio313-live-streaming.sakuracr.jp/demo-site:v0"
}
variable "container_registry_server" {
  type        = string
  description = "Container registry server."
  default     = "creatio313-live-streaming.sakuracr.jp"
}