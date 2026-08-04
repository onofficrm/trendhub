# 트랜드허브 (TrendHub)

CPA 제휴마케팅 플랫폼 — onoffcpa 코드베이스 클론.

- 공개 URL: https://trendhub.iwinv.net
- 플랫폼 코드: `TRENDHUB` (`_site.config.php`)
- CPS: 코드 유지, `LC_CPS_ENABLED=false` (필요 시 true로 재활성)
- SPA 갱신: `cd builder/linkconnect_source && npm run deploy:imports`
- 배포: `main` push → GitHub Actions FTP (`deploy.yml`)

## 서버 초기 설정

`data/**` 는 FTP 배포에서 제외됩니다. DB 접속 정보는 Actions Secrets + `upload-dbconfig` 워크플로, 또는 수동 FTP로 `data/dbconfig.php` 를 올려 주세요.

| 항목 | 값 |
|------|-----|
| Host | `wuk2002.sldb.iwinv.net` |
| User / DB | `trendhub` |
