# GolfShot Analyzer

골프존 샷 상세 화면을 OCR로 읽고 What-if 궤적을 비교하는 별도 프론트엔드 프로젝트입니다.

## OCR API

OCR은 기존 `golf-score` Cloudflare Worker의 `/api/shot-analyze`를 공유합니다. Anthropic API 키를 이 프로젝트에 복사하지 않습니다.

로컬 `.env.local`:

```bash
VITE_SHOT_API_URL=http://localhost:8788/api/shot-analyze
```

배포 프론트:

```bash
VITE_SHOT_API_URL=https://<golf-score-domain>/api/shot-analyze
```

실행:

```bash
npm install
npm run dev
```

## 동작 범위

- 결과 화면 파일 선택 및 드래그 앤 드롭
- JPG, PNG, WEBP, 최대 12MB 검증
- 기존 Worker의 Claude Vision OCR 호출
- 화면에 없는 런치앵글과 스핀은 `null` 처리
- What-if 궤적은 현재 임시 근사 모델이며 골프존 공식 내부 비행 엔진이 아님

실제 거리 알고리즘은 TrackMan/Rapsodo 등 검증 장비 데이터와 비교해 별도 보정해야 합니다.
