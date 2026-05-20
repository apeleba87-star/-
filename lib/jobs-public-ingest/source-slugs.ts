/** 원천 수집 레코드 `job_open_data_raw.source_slug` 에 쓰는 고정 식별자 */

export const JOB_OPEN_DATA_SOURCE_SEOUL_GET_JOB_INFO = "seoul_openapi_get_job_info" as const;

/** 고용24 워크넷 채용정보 목록/상세 API */
export const JOB_OPEN_DATA_SOURCE_WORKNET_WANTED = "worknet_wanted_validation" as const;

export type JobOpenDataSourceSlug =
  | typeof JOB_OPEN_DATA_SOURCE_SEOUL_GET_JOB_INFO
  | typeof JOB_OPEN_DATA_SOURCE_WORKNET_WANTED;
