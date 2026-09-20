import './style.css'

type Shot = { club: string; speed: number; launch: number; spin: number; side: number; carry: number }

const demo: Shot = { club: 'Driver', speed: 236, launch: 11.8, spin: 3180, side: 1250, carry: 198 }
const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <header class="topbar"><div class="brand"><span class="brand-mark">GS</span><span><strong>GolfShot</strong><small>ANALYZER</small></span></div><div class="status"><i></i> SIMULATION CORE ONLINE</div></header>
  <main>
    <section class="intro"><div><p class="eyebrow">SHOT INTELLIGENCE / 01</p><h1>내 샷을 읽고,<br><em>다음 샷을 바꾼다.</em></h1><p class="intro-copy">골프존 결과 화면 한 장에서 핵심 데이터를 추출하고, 물리 기반 What-if 시뮬레이션으로 개선 방향을 즉시 확인합니다.</p></div><div class="intro-note"><span>오늘의 목표</span><strong>좌우 편차를<br>18.4m → 8m</strong><small>사이드스핀을 낮추면<br>더 곧게 날아갑니다.</small></div></section>
    <nav class="tabs"><button class="active">샷 분석</button><button data-scroll="history">히스토리</button><button data-scroll="insights">인사이트</button></nav>
    <section class="dashboard">
      <div class="panel input-panel"><div class="panel-head"><div><p class="eyebrow">01 / CAPTURE</p><h2>샷 데이터 가져오기</h2></div><span class="live-tag">AUTO</span></div><label class="dropzone" for="shot-file"><input id="shot-file" type="file" accept="image/jpeg,image/png,image/webp"><span class="upload-icon">↥</span><strong id="file-name">결과 화면을 업로드하세요</strong><small>JPG, PNG, WEBP · 최대 12MB</small></label><div class="actions"><button class="primary" id="ocr">✦ 자동 OCR</button><button class="secondary" id="demo">데모 데이터 불러오기</button></div><div class="metric-grid"><label>클럽<input id="club" value="Driver"></label><label>볼스피드 <small>km/h</small><input id="speed" type="number" value="236"></label><label>런치앵글 <small>deg</small><input id="launch" type="number" step=".1" value="11.8"></label><label>백스핀 <small>rpm</small><input id="spin" type="number" value="3180"></label><label>사이드스핀 <small>rpm</small><input id="side" type="number" value="1250"></label><label>캐리 <small>m</small><input id="carry" type="number" value="198"></label></div></div>
      <div class="panel trajectory-panel"><div class="panel-head"><div><p class="eyebrow">02 / FLIGHT MODEL</p><h2>비행 궤적 시뮬레이터</h2></div><span class="view-label">TOP VIEW</span></div><div class="canvas-wrap"><canvas id="trajectory" width="760" height="310"></canvas><div class="legend"><span><i class="current"></i>현재 샷</span><span><i class="target"></i>개선 목표</span><span>거리 / m →</span></div></div><div class="stats"><div><small>예상 캐리 변화</small><strong id="gain">+0.0m</strong></div><div><small>좌우 편차</small><strong id="dispersion">+18.4m</strong></div><div><small>최고 높이</small><strong id="apex">28.7m</strong></div></div></div>
    </section>
    <section class="panel whatif"><div class="panel-head"><div><p class="eyebrow">03 / WHAT-IF</p><h2>조건을 바꾸면 어떻게 달라질까?</h2></div><span class="target-label">TARGET SCENARIO</span></div><div class="slider-grid"><label>볼스피드 <input id="speed-delta" type="range" min="-10" max="10" value="0"><output id="speed-output">+0 km/h</output></label><label>런치앵글 <input id="launch-delta" type="range" min="-5" max="5" step=".1" value="2"><output id="launch-output">+2.0°</output></label><label>백스핀 <input id="spin-delta" type="range" min="-1000" max="1000" step="50" value="-500"><output id="spin-output">-500 rpm</output></label><label>사이드스핀 <input id="side-delta" type="range" min="-1500" max="1500" step="50" value="-750"><output id="side-output">-750 rpm</output></label></div><div class="advice"><span class="advice-icon">✦</span><div><small>이번 샷의 개선 포인트</small><strong id="advice">런치앵글을 2° 높이고 백스핀을 줄여보세요</strong></div><button id="save">히스토리에 저장</button></div></section>
    <section class="bottom-grid"><div class="panel" id="history"><div class="panel-head"><div><p class="eyebrow">04 / MEMORY</p><h2>최근 샷</h2></div><span class="count" id="count">0 SHOTS</span></div><div id="history-list" class="history-list"><p class="empty">저장된 샷이 없습니다.</p></div></div><div class="panel" id="insights"><div class="panel-head"><div><p class="eyebrow">05 / COACHING</p><h2>자동 인사이트</h2></div></div><div class="insight"><span>01</span><div><strong>탄도 최적화</strong><p>드라이버 런치앵글을 13~15° 범위로 맞추면 캐리 잠재력이 있습니다.</p></div></div><div class="insight"><span>02</span><div><strong>방향성 개선</strong><p>사이드스핀 500rpm 이하를 목표로 연습해 보세요.</p></div></div></div></section>
  </main>
  <div class="toast" id="toast"></div>
`

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const numeric = (id: string) => Number($<HTMLInputElement>(id).value) || 0
const shot = (): Shot => ({ club: $<HTMLInputElement>('club').value, speed: numeric('speed'), launch: numeric('launch'), spin: numeric('spin'), side: numeric('side'), carry: numeric('carry') })
const signed = (value: number, digits = 0) => `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
const toast = (message: string) => { $('toast').textContent = message; $('toast').classList.add('show'); window.setTimeout(() => $('toast').classList.remove('show'), 2600) }
let selectedShotFile: File | undefined
let trajectoryFrame = 0

function draw(progress = 1) {
  const canvas = $('trajectory') as HTMLCanvasElement, ctx = canvas.getContext('2d')!, current = shot()
  const delta = { speed: numeric('speed-delta'), launch: numeric('launch-delta'), spin: numeric('spin-delta'), side: numeric('side-delta') }
  const speedRatio = current.speed > 0 ? (current.speed + delta.speed) / current.speed : 1
  const speedCarryGain = current.carry * (speedRatio * speedRatio - 1)
  const targetCarry = Math.max(1, current.carry + speedCarryGain + delta.launch * 2.7 - delta.spin * .004)
  const currentApex = Math.max(8, 18 + current.launch * 1.05 - current.spin * .0015), targetApex = Math.max(8, 18 + (current.launch + delta.launch) * 1.05 - (current.spin + delta.spin) * .0015)
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = 'rgba(144,178,152,.16)'; ctx.lineWidth = 1
  for (let y = 40; y < 290; y += 40) { ctx.beginPath(); ctx.moveTo(28, y); ctx.lineTo(740, y); ctx.stroke() }
  const curve = (side: number) => Math.max(-45, Math.min(45, side * .012))
  const route = (carry: number, apex: number, bend: number, color: string, dashed: boolean, visible = 1) => {
    const points = Math.max(1, Math.floor(90 * visible))
    ctx.beginPath(); ctx.setLineDash(dashed ? [8, 7] : []); ctx.lineWidth = dashed ? 2 : 3; ctx.strokeStyle = color
    for (let i = 0; i <= points; i++) { const t = i / 90, x = 35 + t * 690 * Math.min(carry / 260, 1.15), y = 278 - Math.sin(Math.PI * t) * apex * 5.4 + bend * t * t; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
    ctx.stroke(); ctx.setLineDash([])
    return { x: 35 + (points / 90) * 690 * Math.min(carry / 260, 1.15), y: 278 - Math.sin(Math.PI * points / 90) * apex * 5.4 + bend * (points / 90) ** 2 }
  }
  route(targetCarry, targetApex, curve(current.side + delta.side), '#f0bd4d', true)
  const ball = route(current.carry, currentApex, curve(current.side), '#65e0c5', false, progress)
  const glow = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, 18)
  glow.addColorStop(0, 'rgba(255,255,255,.95)'); glow.addColorStop(.2, 'rgba(101,224,197,.8)'); glow.addColorStop(1, 'rgba(101,224,197,0)')
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ball.x, ball.y, 18, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f8fffb'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2); ctx.fill()
  $('gain').textContent = `${signed(targetCarry - current.carry, 1)}m`; $('dispersion').textContent = `${signed(Math.abs((current.side + delta.side) * .014), 1)}m`; $('apex').textContent = `${targetApex.toFixed(1)}m`; $('advice').textContent = targetCarry - current.carry > 4 ? `캐리 ${current.carry.toFixed(0)}m → ${targetCarry.toFixed(0)}m, 런치앵글을 높이고 스핀을 줄여보세요` : '사이드스핀을 줄여 좌우 편차를 먼저 낮춰보세요'
  $('speed-output').textContent = `${signed(delta.speed)} km/h`; $('launch-output').textContent = `${signed(delta.launch, 1)}°`; $('spin-output').textContent = `${signed(delta.spin)} rpm`; $('side-output').textContent = `${signed(delta.side)} rpm`
}

function animateTrajectory(repeats = 3) { cancelAnimationFrame(trajectoryFrame); const started = performance.now(); const duration = 880; const gap = 90; const cycle = duration + gap; const total = cycle * repeats; const tick = (now: number) => { const elapsed = now - started; const progressInCycle = Math.min(1, (elapsed % cycle) / duration); const eased = 1 - Math.pow(1 - progressInCycle, 3); draw(eased); if (elapsed < total) trajectoryFrame = requestAnimationFrame(tick); else draw(1) }; trajectoryFrame = requestAnimationFrame(tick) }
function apply(data: Partial<Shot>) { const fields: Record<string, keyof Shot> = { club: 'club', speed: 'speed', launch: 'launch', spin: 'spin', side: 'side', carry: 'carry' }; Object.entries(fields).forEach(([id, key]) => { if (data[key] !== undefined) $<HTMLInputElement>(id).value = String(data[key]) }); animateTrajectory(3) }
function history() { return JSON.parse(localStorage.getItem('golfshot-history') || '[]') as Shot[] }
function renderHistory() { const items = history(); $('count').textContent = `${items.length} SHOTS`; $('history-list').innerHTML = items.length ? items.slice(0, 6).map((item) => `<div class="history-row"><strong>${item.club}</strong><span>${item.carry}m · ${item.speed}km/h · ${item.launch}°</span></div>`).join('') : '<p class="empty">저장된 샷이 없습니다.</p>' }

document.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach((field) => field.addEventListener('input', () => animateTrajectory(3)))
document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((field) => field.addEventListener('input', () => animateTrajectory(3)))
$('demo').addEventListener('click', () => { apply(demo); toast('데모 샷 데이터를 불러왔습니다.') })
$('save').addEventListener('click', () => { localStorage.setItem('golfshot-history', JSON.stringify([shot(), ...history()].slice(0, 20))); renderHistory(); toast('샷을 히스토리에 저장했습니다.') })
function setShotFile(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) { toast('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.'); return }
  if (file.size > 12 * 1024 * 1024) { toast('이미지는 12MB 이하로 업로드하세요.'); return }
  $('file-name').textContent = file.name
  selectedShotFile = file
  toast('이미지를 불러왔습니다. 궤적을 재생합니다. 자동 OCR을 눌러 분석하세요.')
  animateTrajectory()
}

$('shot-file').addEventListener('change', (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) setShotFile(file) })
const dropzone = $('shot-file').closest('.dropzone') as HTMLElement
dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('dragover') })
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'))
dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('dragover'); const file = event.dataTransfer?.files?.[0]; if (file) setShotFile(file) })
$('ocr').addEventListener('click', async () => { const file = selectedShotFile || ($('shot-file') as HTMLInputElement).files?.[0]; if (!file) { apply(demo); toast('이미지가 없어 데모 데이터를 표시했습니다.'); return } const button = $('ocr') as HTMLButtonElement; button.disabled = true; button.textContent = 'OCR 분석 중...'; try { const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file) }); const endpoint = import.meta.env.VITE_SHOT_API_URL || '/api/shot-analyze'; const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mimeType: file.type }) }); if (!response.ok) throw new Error('OCR API를 확인하세요'); const result = await response.json(); apply({ club: result.data.club, speed: result.data.ballSpeedMs ? result.data.ballSpeedMs * 3.6 : undefined, launch: result.data.launchAngleDeg, spin: result.data.backSpinRpm, side: result.data.sideSpinRpm, carry: result.data.carryM ?? result.data.totalM }); toast('샷 데이터를 자동 추출했습니다.') } catch (error) { toast(error instanceof Error ? error.message : 'OCR 오류가 발생했습니다.') } finally { button.disabled = false; button.textContent = '✦ 자동 OCR' } })
document.querySelectorAll<HTMLButtonElement>('.tabs button[data-scroll]').forEach((button) => button.addEventListener('click', () => $(button.dataset.scroll!).scrollIntoView({ behavior: 'smooth' })))
renderHistory(); apply(demo)
