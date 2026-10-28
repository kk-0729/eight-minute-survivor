# 8분의 생존

HTML과 JavaScript로 만든 단일 플레이어 브라우저 게임입니다. 원본은 `src/`이며,
빌드한 `dist/index.html`을 Chrome 또는 Edge에서 열 수 있습니다.

## 검사와 빌드

Node.js 22가 있으면 저장소 폴더에서 다음 명령을 실행합니다. 별도 패키지 설치는 필요 없습니다.

```powershell
node --test tests/game.test.cjs
node scripts/build.cjs
```

테스트는 브라우저 환경을 흉내 낸 가벼운 자동 검사입니다. 실제 브라우저에서의 화면,
프레임 속도, 장시간 플레이 밸런스까지 보증하지는 않습니다. 빌드는 `src/`만
`build-pages/`에 복사하고 `.nojekyll`을 추가하며, 로컬 실행용 `dist/`도 갱신합니다.
`build-pages/`는 생성물이며 Git에 포함되지 않습니다.

로컬 서버에서 확인하려면 빌드한 다음 `python -m http.server 8877 --directory build-pages`를
실행하고 브라우저에서 `http://127.0.0.1:8877/`을 엽니다.

## 전투 수치

다음은 이 게임의 임시 테스트 값입니다. 세피리아 실제 전체 공식이나 데이터로 확정한 것이 아닙니다.
속성별 공격력은 각각 20이며, 검/석궁/지팡이의 계수는 1/1/0.7, 초기 간격은
0.50/0.33/0.40초입니다. 치명타는 기존에 없었으므로 초기 확률은 0%, 임시 배율은 1.5배입니다.
직접 피해에 방어 감소율 `clamp(0.445 * ln(1 + DEF / 40), 0, 0.9)`을 한 번 적용합니다.
화상과 번개 전이는 최종 직접 피해의 10%와 40%를 사용하며 방어력을 다시 적용하지 않습니다.
화상 재적중은 지속시간을 갱신하되 다음 틱까지의 시간은 유지합니다.

예시 자동 TTK 시험은 체력 40, 방어 0, 물리 속성, 강화 없음, 정지 적과 70픽셀 거리에서
검 0.59초, 석궁 0.54초, 지팡이 1.09초입니다. 이는 초기 조건의 예시이며 8분 전체의 밸런스를
검증한 값은 아닙니다. 기존 게임의 화상·감전 조합 아이템은 호환성을 위해 유지했습니다.

## GitHub Pages 배포

`.github/workflows/pages.yml`은 `main`에 Push할 때 테스트와 빌드를 실행하고,
성공한 결과만 GitHub Pages에 올립니다. Pull Request에서는 테스트와 빌드만 합니다.
배포 작업에는 GitHub Actions의 Pages 권한과 OIDC가 사용되며 별도 비밀값을 추가하지 않습니다.

최초 설정:

1. 게임 전용 GitHub 저장소를 만듭니다. 공개 저장소에 Push하면 게임 코드, 이미지와
   Git 이력이 공개됩니다. 이미지 출처와 권리 정보는 `ASSET_SOURCES.md`를 확인하세요.
2. 이 게임 저장소에 GitHub 원격을 연결하고 `main`을 Push합니다. 개인 Git 인증이 필요한
   경우 Git Credential Manager의 로그인 창에서 직접 로그인합니다. 토큰이나 비밀번호를
   명령행, 환경변수 또는 파일에 직접 넣지 않습니다.
3. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**를
   **GitHub Actions**로 선택합니다. 설정이 Push 후에 이뤄졌다면 Actions 탭에서
   `Verify and deploy game`을 수동 실행하거나 이후 `main`에 Push합니다.
4. Actions 실행이 성공하면 Pages 설정 또는 해당 배포 작업에 표시된 URL로 접속합니다.

기존 `chatgpt.site`는 별도 호스팅이므로 GitHub Pages가 갱신해 주지 않습니다.
테스트 통과와 Push 성공, GitHub Actions 실행 성공, 실제 사이트 접속은 각각 별도로 확인해야 합니다.
