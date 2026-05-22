{{- define "campaign-platform.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "campaign-platform.fullname" -}}
{{- .Release.Name -}}
{{- end -}}

{{- define "campaign-platform.labels" -}}
app.kubernetes.io/name: {{ include "campaign-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "campaign-platform.databaseUrl" -}}
postgresql://{{ .Values.global.postgres.user }}:{{ .Values.global.postgres.password }}@{{ .Values.global.postgres.host }}:{{ .Values.global.postgres.port }}/{{ .Values.global.postgres.database }}
{{- end -}}
