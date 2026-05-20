export type WorknetListItem = {
  wantedAuthNo: string;
  company: string;
  busino: string;
  indTpNm: string;
  title: string;
  salTpNm: string;
  sal: string;
  minSal: string;
  maxSal: string;
  region: string;
  holidayTpNm: string;
  minEdubg: string;
  maxEdubg: string;
  career: string;
  regDt: string;
  closeDt: string;
  infoSvc: string;
  wantedInfoUrl: string;
  wantedMobileInfoUrl: string;
  jobsCd: string;
  empTpCd: string;
};

export type WorknetListParsed = {
  total: number;
  startPage: number;
  display: number;
  items: WorknetListItem[];
};
