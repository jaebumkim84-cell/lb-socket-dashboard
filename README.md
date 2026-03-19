# LB & Socket, Load Board 관리 대시보드

## 프로젝트 개요

반도체 테스트 장비의 소켓(Socket)과 로드보드(Load Board) 관리를 위한 종합 대시보드입니다. SOCKET 재고 현황과 L/Board 정보를 효율적으로 관리하고 시각화합니다.

## 주요 기능

### ✅ 현재 완료된 기능

#### 1. **대시보드 (Dashboard)**
- **KPI 카드**: 총 소켓 항목, 소켓 총 수량, PKG 유형 수, TESTER 수, Data 보드 수, FT 유형 수
- **차트 시각화**:
  - PKG TYPE별 수량 (Bar Chart)
  - TESTER별 소켓 분포 (Doughnut Chart)
  - Body Size TOP 10 (Horizontal Bar Chart)
  - 도킹유형 분포 (Doughnut Chart)
  - 양산 FT 분포 (Bar Chart)
  - 보드 제작처 분포 (Bar Chart)

#### 2. **SOCKET 관리**
- JavaScript 파일 (`socket-data.js`)에서 데이터 로드
- 실시간 테이블 편집 (인라인 편집)
- 필터링:
  - TESTER별 필터
  - PKG 계열별 필터
  - 전체 텍스트 검색 (PKG / Body Size / Socket No 등)
- 정렬: 컬럼 헤더 클릭으로 오름차순/내림차순 정렬
- 데이터 추가: 모달 폼을 통한 신규 행 추가
- 데이터 삭제: 행별 삭제 기능
- CSV 내보내기: 현재 필터된 데이터 CSV 다운로드
- 로컬 스토리지 저장: 브라우저에 변경사항 저장

#### 3. **L/Board 관리**
- JavaScript 파일 (`loadboard-data.js`)에서 데이터 로드
- 실시간 테이블 편집 (인라인 편집)
- 필터링:
  - Tester별 필터
  - 도킹유형별 필터 (Flat Cable / Direct Duking)
  - 양산FT별 필터 (WINPAC / FBHS / GMTEST)
  - 보드제작처별 필터
  - 전체 텍스트 검색 (제품명 / PKG / 보드번호 등)
- 정렬: 컬럼 헤더 클릭으로 오름차순/내림차순 정렬
- 데이터 추가: 모달 폼을 통한 신규 행 추가
- 데이터 삭제: 행별 삭제 기능
- CSV 내보내기: 현재 필터된 데이터 CSV 다운로드
- 로컬 스토리지 저장: 브라우저에 변경사항 저장

#### 4. **데이터 관리**
- **JavaScript 파일 기반**: 초기 데이터를 JavaScript 파일에서 로드 (웹 서버 불필요)
- **로컬 스토리지 우선**: 로컬 스토리지에 저장된 데이터가 있으면 JavaScript 파일보다 우선 사용
- **실시간 업데이트**: 모든 변경사항이 즉시 대시보드와 차트에 반영

#### 5. **UI/UX**
- 다크 테마 디자인
- 반응형 레이아웃
- 실시간 시계 표시
- 토스트 알림
- 신규 추가된 행 하이라이트 (초록색 배경)
- 뱃지 스타일 (TESTER, 도킹유형)

## 파일 구조

```
.
├── index.html          # 메인 HTML 파일 (대시보드 애플리케이션)
├── socket-data.js      # SOCKET 관리 초기 데이터 (JavaScript)
├── loadboard-data.js   # L/Board 관리 초기 데이터 (JavaScript)
├── socket.csv          # SOCKET 데이터 원본 (참고용)
├── loadboard.csv       # L/Board 데이터 원본 (참고용)
└── README.md          # 프로젝트 문서 (현재 파일)
```

## 사용 방법

### 1. 간단한 실행 방법 (권장)

**index.html 파일을 더블클릭하여 브라우저에서 직접 실행**하면 됩니다!

- 웹 서버 설정 불필요
- 로컬 파일 시스템에서 즉시 실행 가능
- Chrome, Firefox, Edge, Safari 모두 지원

### 2. 데이터 초기화

처음 실행하거나 초기 데이터로 리셋하고 싶을 때:

```javascript
// 브라우저 콘솔에서 실행 (F12 → Console 탭)
localStorage.removeItem('lb_socket');
localStorage.removeItem('lb_data');
location.reload();
```

### 3. 데이터 편집
- **인라인 편집**: 테이블 셀을 직접 클릭하여 수정
- **행 추가**: "＋ 행 추가" 버튼으로 모달 폼 열기
- **행 삭제**: 각 행의 🗑 버튼 클릭
- **저장**: "💾 저장" 버튼으로 로컬 스토리지에 변경사항 저장

### 4. 데이터 내보내기
- "⬇ CSV" 버튼으로 현재 필터된 데이터를 CSV 파일로 다운로드

## 데이터 구조

### socket-data.js
```javascript
const SOCKET_DATA = [
  {
    "group": "",
    "SN": "1",
    "TESTER": "3380D",
    "PKG_TYPE": "64_LQFP",
    "Body_Size": "10x10",
    "socket_qty": 2,
    "cover_qty": 2,
    "location": "ABOV",
    "engineer": "김희국",
    "socket_no": "64P-0.5OS-SAR1",
    "pogo_pin": "028S-038AMR-FA",
    "comment": ""
  },
  // ... more data
];
```

**필드 설명**:
- `group`: 그룹 (선택사항)
- `SN`: 일련번호
- `TESTER`: 테스터 종류 (3380D, T3347A, 3360D)
- `PKG_TYPE`: 패키지 타입 (예: 64_LQFP, 32_QFN)
- `Body_Size`: 바디 사이즈
- `socket_qty`: 소켓 수량
- `cover_qty`: 커버 수량
- `location`: 위치
- `engineer`: 제작 엔지니어
- `socket_no`: 소켓 번호
- `pogo_pin`: 포고핀 정보
- `comment`: 비고

### loadboard-data.js
```javascript
const LOADBOARD_DATA = [
  {
    "Tester": "3380D",
    "도킹유형": "Flat Cable",
    "보드번호_SN": "B-WB80-1",
    "PKG_Type": "64_LQFP",
    "body_Size": "10x10-0.5",
    "양산_FT": "WINPAC",
    "보드제작처": "디엔텍",
    "Socket제작처": "WINPAC",
    "제품명": "A31G336RLN",
    "자작FT가능": "O",
    "사용DUT": "",
    "미사용보드": "",
    "Comment": "",
    "PCB_Ver": "R0.0",
    "Engr": "김희국"
  },
  // ... more data
];
```

**필드 설명**:
- `Tester`: 테스터 종류
- `도킹유형`: Flat Cable 또는 Direct Duking
- `보드번호_SN`: 보드 번호
- `PKG_Type`: 패키지 타입
- `body_Size`: 바디 사이즈
- `양산_FT`: 양산 FT (WINPAC, FBHS, GMTEST)
- `보드제작처`: 보드 제작 업체
- `Socket제작처`: 소켓 제작 업체
- `제품명`: 제품명
- `자작FT가능`: 자작 FT 가능 여부 (O/X)
- `사용DUT`: 사용 DUT 정보
- `미사용보드`: 미사용 보드 정보
- `Comment`: 비고
- `PCB_Ver`: PCB 버전
- `Engr`: 담당 엔지니어

## 초기 데이터 업데이트 방법

초기 데이터를 변경하고 싶을 때:

1. **CSV 파일 편집** (Excel 등에서):
   - `socket.csv` 또는 `loadboard.csv` 편집
   
2. **JavaScript 파일로 변환**:
   - CSV 데이터를 JSON 형식으로 변환
   - `socket-data.js` 또는 `loadboard-data.js` 파일 업데이트
   - 배열 형식으로 `SOCKET_DATA` 또는 `LOADBOARD_DATA` 변수에 할당

3. **브라우저 새로고침**:
   - 로컬 스토리지 초기화 후 페이지 새로고침

## 기술 스택

- **HTML5**: 구조
- **CSS3**: 스타일링 (다크 테마, 반응형 디자인)
- **JavaScript (ES6+)**: 로직 및 상호작용
- **Chart.js 4.4.0**: 데이터 시각화
- **localStorage**: 클라이언트 사이드 데이터 저장

## 브라우저 호환성

- Chrome/Edge: ✅ 완벽 지원
- Firefox: ✅ 완벽 지원  
- Safari: ✅ 완벽 지원
- **로컬 파일 실행**: ✅ 모든 브라우저에서 지원 (웹 서버 불필요)

## 데이터 백업

⚠️ **중요**: 이 애플리케이션은 클라이언트 사이드에서만 작동하며, 서버에 데이터를 저장하지 않습니다.

**백업 권장사항**:
1. "💾 저장" 버튼으로 로컬 스토리지에 저장
2. "⬇ CSV" 버튼으로 정기적으로 CSV 파일 다운로드
3. 브라우저 캐시/쿠키 삭제 시 로컬 스토리지 데이터도 삭제될 수 있음
4. 다른 컴퓨터에서 사용하려면 CSV 파일을 내보내서 전달

## 장점

✅ **간편한 실행**: 파일을 더블클릭만 하면 됩니다  
✅ **웹 서버 불필요**: 로컬 파일 시스템에서 바로 실행  
✅ **빠른 로딩**: 네트워크 요청 없이 즉시 데이터 로드  
✅ **이식성**: 파일 3개만 있으면 어디서든 사용 가능  
✅ **데이터 보안**: 외부 서버 없이 로컬에서만 작동

## 향후 개발 계획

### 🔜 추가 예정 기능

1. **데이터 동기화**
   - 서버 기반 데이터 저장
   - 여러 사용자 간 데이터 공유

2. **고급 필터링**
   - 복합 필터 조건
   - 저장된 필터 프리셋

3. **보고서 생성**
   - PDF 내보내기
   - 인쇄 최적화 레이아웃

4. **사용자 관리**
   - 로그인/권한 시스템
   - 편집 이력 추적

5. **알림 시스템**
   - 재고 부족 알림
   - 정기 점검 알림

6. **모바일 최적화**
   - 터치 제스처 지원
   - 모바일 전용 레이아웃

7. **데이터 분석**
   - 트렌드 분석
   - 예측 모델

## 문제 해결

### 브라우저 보안 경고
- **증상**: 일부 브라우저에서 로컬 파일 실행 시 경고 표시
- **해결**: 신뢰할 수 있는 파일이므로 "계속" 또는 "허용" 선택

### 로컬 스토리지 데이터 초기화
```javascript
// 브라우저 콘솔에서 실행
localStorage.removeItem('lb_socket');
localStorage.removeItem('lb_data');
location.reload();
```

### 다른 컴퓨터로 데이터 이동
1. 현재 컴퓨터에서 "⬇ CSV" 버튼으로 데이터 내보내기
2. CSV 파일을 다른 컴퓨터로 복사
3. CSV 데이터를 JavaScript 파일로 변환
4. `socket-data.js` 또는 `loadboard-data.js` 업데이트

## 자주 묻는 질문 (FAQ)

**Q: 웹 서버가 필요한가요?**  
A: 아니오, `index.html` 파일을 더블클릭하면 바로 실행됩니다.

**Q: 인터넷 연결이 필요한가요?**  
A: Chart.js 라이브러리는 CDN에서 로드되므로 처음 실행 시에는 인터넷이 필요합니다. 이후에는 브라우저 캐시로 오프라인 사용 가능합니다.

**Q: 데이터를 어떻게 백업하나요?**  
A: "⬇ CSV" 버튼으로 CSV 파일로 내보낼 수 있습니다.

**Q: 여러 사용자가 같은 데이터를 공유할 수 있나요?**  
A: 현재 버전에서는 지원하지 않습니다. 각 컴퓨터/브라우저에서 독립적으로 작동합니다.

## 라이선스

이 프로젝트는 내부 관리용 도구입니다.

## 문의

프로젝트 관련 문의나 버그 리포트는 개발팀에 연락 바랍니다.

---

**마지막 업데이트**: 2026-03-19  
**버전**: 2.0.0  
**주요 변경사항**: CSV 로드 방식을 JavaScript 파일 방식으로 변경하여 웹 서버 없이 로컬 실행 가능
