# Oriburger Games 홈페이지

<https://oriburgergames.com> — Jekyll 기반 정적 사이트. [Agency Jekyll Theme](https://github.com/raviriley/agency-jekyll-theme)(MIT)를 바탕으로 커스터마이즈했다.

## 구조

```
_config.yml          사이트 설정 (url / baseurl / title / locale / og_image)
_data/
  sitetext.yml       화면에 표시되는 모든 텍스트 (헤더, 소개, 타임라인, 팀, 연락처, 푸터)
  navigation.yml     상단 메뉴
  style.yml          강조색, 배경 이미지, 웹폰트 URL
_portfolio/          Awards 섹션 항목 (파일명 순서대로 표시)
_layouts/            default(공통 뼈대) → home(메인) / page(404, legal)
_includes/           섹션별 템플릿 (nav, masthead, services, portfolio_grid, modals, about, timeline, team, clients, contact, footer)
_sass/               스타일. base/_theme.scss 가 라이트/다크 토큰, base/_animations.scss 가 등장 애니메이션
assets/css/agency.scss  Sass 진입점 (Liquid 로 style.yml 값을 주입)
assets/js/agency.js  스크롤/내비/애니메이션/테마 토글
assets/img, fonts    이미지, 로컬 폰트(Wuinbold)
scripts/verify.mjs   로컬 검증 스크립트 (npm test)
claude/              AI 작업 요청서와 이력
```

## 콘텐츠 수정

| 하고 싶은 것 | 수정할 곳 |
| --- | --- |
| 문구 바꾸기 | `_data/sitetext.yml` |
| 팀원 추가 | `_data/sitetext.yml` → `team.people`. 사진(`assets/img/team/`)이 없으면 이니셜 아바타가 표시됨 |
| 타임라인 항목 추가 | `_data/sitetext.yml` → `timeline.events`. `image` 또는 `icon`(Font Awesome) 지정 |
| 수상 내역 추가 | `_portfolio/NN_이름.md` 생성, 썸네일은 `assets/img/portfolio/` (400×300) |
| 트레일러 영상 교체 | `_data/sitetext.yml` → `services.video` (YouTube ID) |
| 강조색 / 폰트 | `_data/style.yml`, `_sass/base/_mixins.scss` |
| 다크 테마 색상 | `_sass/base/_theme.scss` |

이미지 경로는 항상 `assets/...` 로 적고, 템플릿에서 `relative_url` 필터를 거친다. `_config.yml` 의 `baseurl` 은 커스텀 도메인 루트에서 서비스되므로 반드시 빈 문자열이어야 한다(하위 경로 배포 시에만 `/repo-name`).

## 로컬 미리보기

```sh
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

## 검증 (Ruby 없이)

```sh
npm install
npm test
```

YAML 파싱, Sass 컴파일, 페이지 렌더링, 에셋 경로 존재 여부, 콘텐츠 검사를 수행하고 렌더 결과를 `.check/` 에 남긴다.

## 배포

`master` 브랜치에 push 하면 `.github/workflows/jekyll-gh-pages.yml` 이 GitHub Pages 로 빌드·배포한다. 커스텀 도메인은 저장소 Settings → Pages 에서 관리한다.

## 문의 폼

`_config.yml` 의 `email` 로 Formspree 에 전송된다. Formspree 는 이메일 기반 엔드포인트를 단계적으로 폐지 중이므로, 폼이 동작하지 않으면 Formspree 에서 폼 ID를 발급받아 `formspree_form_path` 를 설정할 것.
