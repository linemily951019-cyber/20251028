let table;
let qBank = [];
let quiz = [];
let current = 0;
let score = 0;
let answered = false;
let selected = -1;
const QUIZ_SIZE = 5;
const optionRects = [];

// 視覺特效容器
let leaves = [];
let fireworks = [];
let rainDrops = [];

let inResult = false;
let resultStartTime = 0;
let fireworksEndTime = 0;

function preload() {
  table = loadTable('questions.csv', 'csv');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial');
  loadQuestionsFromTable();
  startQuiz();
  frameRate(60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 背景淡黃色
  background(255, 250, 205);

  // 置中模式與矩形中心繪製
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  textSize(20);
  fill(0);

  // 落葉特效（半透明）
  spawnLeaves();
  updateAndDrawLeaves();

  if (quiz.length === 0) {
    text("題庫載入失敗或題數不足。請檢查 questions.csv。", width / 2, height / 2);
    return;
  }

  const centerX = width / 2;
  const margin = 40;
  const contentW = min(1000, width - margin * 2);

  // 按鈕中心 Y（往上移）
  const BTN_CENTER_Y = height - 160;

  if (current >= QUIZ_SIZE) {
    if (!inResult) {
      inResult = true;
      resultStartTime = millis();
      if (score === 5) {
        fireworksEndTime = Infinity;
      } else if (score >= 3) {
        fireworksEndTime = millis() + 1000;
      } else {
        fireworksEndTime = 0;
      }
      fireworks = [];
      rainDrops = [];
    }

    // 成績與回饋（全部 20px 並置中）
    text(`測驗完成！ 得分： ${score} / ${QUIZ_SIZE}`, centerX, 60, contentW);
    let msg = "";
    if (score === 5) msg = "你實在是太棒了 !";
    else if (score >= 3) msg = "不錯哦 ! 會越來越好 !";
    else msg = "再接再厲 !";
    text(msg, centerX, 100, contentW);

    // 答題清單（位於成績與回饋下方並置中）
    const startY = 140;
    const availableH = max(200, height - startY - 240);
    const lineH = min(120, availableH / QUIZ_SIZE);

    for (let i = 0; i < quiz.length; i++) {
      const q = quiz[i];
      const yMid = startY + i * lineH + lineH / 2;

      const correct = q.chosen && q.chosen === q.answer;
      if (correct) fill(0, 60, 20); // 墨綠
      else fill(120, 0, 0); // 暗紅

      // 題號（上）與題目（下）
      textSize(13);
      text(`第 ${i + 1} 題`, centerX, yMid - 20);
      text(`${q.question}`, centerX, yMid, contentW);

      // 你的答案與正確答案（置中）
      fill(40);
      const your = q.chosen ? `${q.chosen}. ${q['option' + q.chosen] || ''}` : "未作答";
      const corr = q.answer ? `${q.answer}. ${q['option' + q.answer] || ''}` : "N/A";
      text(`你的答案：${your}    正確答案：${corr}`, centerX, yMid + 20, contentW);

      textSize(20);
    }

    // 重新測驗按鈕（中心對齊）
    drawButton(centerX, BTN_CENTER_Y, 220, 56, "重新測驗");

    // 特效控制
    if (score === 5) {
      if (frameCount % 18 === 0) launchFirework();
    } else if (score >= 3) {
      if (millis() <= fireworksEndTime) {
        if (frameCount % 12 === 0) launchFirework();
      }
    } else {
      spawnRain();
    }

    updateAndDrawFireworks();
    updateAndDrawRain();

    return;
  } else {
    inResult = false;
  }

  // 顯示題號（置中，上方）
  const titleY = 80;
  text(`第 ${current + 1} 題`, centerX, titleY);

  // 題目（置中，位於題號下方）
  const questionY = titleY + 60;
  text(quiz[current].question, centerX, questionY, contentW);

  // 選項區域（用中心繪製，框與文字皆置中）
  optionRects.length = 0;
  const opts = ['A', 'B', 'C', 'D'];
  const startY = questionY + 80;
  const gap = 14;
  const h = min(80, (height - startY - 240) / 4);
  const w = contentW;
  const cx = centerX;

  for (let i = 0; i < 4; i++) {
    const cy = startY + i * (h + gap) + h / 2;
    // 根據狀態決定顏色
    if (answered) {
      if (i === selected) {
        if (opts[i] === quiz[current].answer) fill(144, 238, 144);
        else fill(255, 182, 193);
      } else if (opts[i] === quiz[current].answer) {
        fill(144, 238, 144);
      } else fill(255);
    } else {
      if (i === selected) fill(220);
      else fill(255);
    }

    stroke(100);
    rect(cx, cy, w, h, 8);

    noStroke();
    fill(0);
    textSize(20);
    textAlign(CENTER, CENTER);
    text(`${opts[i]}. ${quiz[current]['option' + opts[i]]}`, cx, cy, w - 32);

    optionRects.push({ cx, cy, w, h });
  }

  // 下一題按鈕（中心對齊並往上）
  if (answered) {
    drawButton(centerX, BTN_CENTER_Y, 220, 56, "下一題");
  }

  // 更新並畫出殘留特效
  updateAndDrawFireworks();
  updateAndDrawRain();
}

/* ---------- 互動 ---------- */
function mousePressed() {
  if (quiz.length === 0) return;

  const BTN_CENTER_Y = height - 160;

  if (current >= QUIZ_SIZE) {
    if (isInsideCenter(mouseX, mouseY, width / 2, BTN_CENTER_Y, 220, 56)) {
      startQuiz();
      return;
    }
  }

  if (answered) {
    if (isInsideCenter(mouseX, mouseY, width / 2, BTN_CENTER_Y, 220, 56)) {
      current++;
      answered = false;
      selected = -1;
    }
    return;
  }

  for (let i = 0; i < optionRects.length; i++) {
    const r = optionRects[i];
    if (isInsideCenter(mouseX, mouseY, r.cx, r.cy, r.w, r.h)) {
      selected = i;
      answered = true;
      const q = quiz[current];
      const opts = ['A', 'B', 'C', 'D'];
      const chosen = opts[i];
      q.chosen = chosen;
      if (chosen === q.answer) score++;
      break;
    }
  }
}

/* ---------- 載入題庫 ---------- */
function loadQuestionsFromTable() {
  qBank = [];
  if (!table) return;
  for (let r = 0; r < table.getRowCount(); r++) {
    const row = table.getRow(r);

    let question = row.get('question');
    let optionA = row.get('optionA');
    let optionB = row.get('optionB');
    let optionC = row.get('optionC');
    let optionD = row.get('optionD');
    let answer = row.get('answer');

    if (question === undefined || optionA === undefined || optionB === undefined ||
        optionC === undefined || optionD === undefined || answer === undefined) {
      try {
        question = question === undefined ? row.getString(0) : question;
        optionA = optionA === undefined ? row.getString(1) : optionA;
        optionB = optionB === undefined ? row.getString(2) : optionB;
        optionC = optionC === undefined ? row.getString(3) : optionC;
        optionD = optionD === undefined ? row.getString(4) : optionD;
        answer = answer === undefined ? row.getString(5) : answer;
      } catch (e) {
        continue;
      }
    }

    question = question ? question.toString().trim() : "";
    optionA = optionA ? optionA.toString().trim() : "";
    optionB = optionB ? optionB.toString().trim() : "";
    optionC = optionC ? optionC.toString().trim() : "";
    optionD = optionD ? optionD.toString().trim() : "";
    answer = answer ? answer.toString().trim().toUpperCase() : "";

    if (question && optionA) {
      qBank.push({
        question,
        optionA,
        optionB,
        optionC,
        optionD,
        answer
      });
    }
  }
}

/* ---------- 開始測驗 ---------- */
function startQuiz() {
  score = 0;
  current = 0;
  answered = false;
  selected = -1;
  inResult = false;
  resultStartTime = 0;
  fireworksEndTime = 0;
  fireworks = [];
  rainDrops = [];
  leaves = [];

  const indices = Array.from({ length: qBank.length }, (_, i) => i);
  shuffleArray(indices);
  const take = Math.min(QUIZ_SIZE, indices.length);
  quiz = indices.slice(0, take).map(i => {
    const q = Object.assign({}, qBank[i]);
    q.chosen = null;
    return q;
  });
}

/* ---------- UI ---------- */
function drawButton(cx, cy, w, h, label) {
  rectMode(CENTER);
  stroke(80);
  fill(220);
  rect(cx, cy, w, h, 8);
  noStroke();
  fill(0);
  textSize(20);
  textAlign(CENTER, CENTER);
  text(label, cx, cy);
  textAlign(CENTER, CENTER);
}

function isInsideCenter(px, py, cx, cy, w, h) {
  return px >= cx - w / 2 && px <= cx + w / 2 && py >= cy - h / 2 && py <= cy + h / 2;
}

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/* ---------- 落葉 ---------- */
class Leaf {
  constructor() {
    this.x = random(width);
    this.y = random(-200, -20);
    this.size = random(12, 28);
    this.angle = random(TWO_PI);
    this.rotSpeed = random(-0.02, 0.02);
    this.xSpeed = random(-0.5, 0.5);
    this.ySpeed = random(0.6, 2);
    this.color = color(180 + random(-20,20), 120 + random(-30,30), 40 + random(-20,20), 180);
  }
  update() {
    this.x += this.xSpeed;
    this.y += this.ySpeed;
    this.angle += this.rotSpeed;
  }
  offscreen() {
    return this.y - this.size > height + 50 || this.x < -100 || this.x > width + 100;
  }
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    noStroke();
    fill(this.color);
    ellipse(0, 0, this.size * 0.6, this.size);
    pop();
  }
}

function spawnLeaves() {
  if (random() < 0.25 && leaves.length < 120) leaves.push(new Leaf());
}

function updateAndDrawLeaves() {
  for (let i = leaves.length - 1; i >= 0; i--) {
    leaves[i].update();
    leaves[i].draw();
    if (leaves[i].offscreen()) leaves.splice(i, 1);
  }
}

/* ---------- 煙火 ---------- */
class FireParticle {
  constructor(x, y, vx, vy, col, lifespan = 120) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, 0.02);
    this.col = col;
    this.lifespan = lifespan;
    this.age = 0;
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.age++;
  }
  done() {
    return this.age > this.lifespan;
  }
  draw() {
    noStroke();
    const a = map(this.age, 0, this.lifespan, 255, 0);
    fill(red(this.col), green(this.col), blue(this.col), a);
    ellipse(this.pos.x, this.pos.y, 3 + (1 - this.age / this.lifespan) * 4);
  }
}

class Firework {
  constructor(x) {
    this.rocket = new FireParticle(x, height + 10, 0, random(-10, -16), color(255,255,255), 999);
    this.exploded = false;
    this.particles = [];
    this.targetY = random(height * 0.15, height * 0.45);
  }
  update() {
    if (!this.exploded) {
      this.rocket.update();
      if (this.rocket.vel.y >= 0 || this.rocket.pos.y <= this.targetY) {
        this.explode();
      }
    }
    for (let p of this.particles) p.update();
    this.particles = this.particles.filter(p => !p.done());
  }
  explode() {
    this.exploded = true;
    let cols = [];
    for (let i = 0; i < 6; i++) cols.push(color(random(180,255), random(100,255), random(100,255)));
    const count = floor(random(40, 120));
    for (let i = 0; i < count; i++) {
      const a = random(TWO_PI);
      const speed = random(1.5, 6);
      const vx = cos(a) * speed;
      const vy = sin(a) * speed;
      const c = random(cols);
      this.particles.push(new FireParticle(this.rocket.pos.x, this.rocket.pos.y, vx, vy, c, 90 + random(-20,40)));
    }
  }
  done() {
    return this.exploded && this.particles.length === 0;
  }
  draw() {
    if (!this.exploded) {
      noStroke();
      fill(255, 220);
      ellipse(this.rocket.pos.x, this.rocket.pos.y, 4);
    }
    for (let p of this.particles) p.draw();
  }
}

function launchFirework() {
  fireworks.push(new Firework(random(width * 0.1, width * 0.9)));
}

function updateAndDrawFireworks() {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].draw();
    if (fireworks[i].done()) fireworks.splice(i, 1);
  }
}

/* ---------- 雨 ---------- */
class RainDrop {
  constructor() {
    this.x = random(width);
    this.y = random(-200, -20);
    this.len = random(12, 28);
    this.speed = random(6, 14);
    this.col = color(100, 140, 200, 180);
  }
  update() {
    this.y += this.speed;
  }
  offscreen() {
    return this.y > height + 20;
  }
  draw() {
    stroke(this.col);
    strokeWeight(2);
    line(this.x, this.y, this.x, this.y + this.len);
  }
}

function spawnRain() {
  if (frameCount % 2 === 0 && rainDrops.length < 400) {
    rainDrops.push(new RainDrop());
  }
}

function updateAndDrawRain() {
  for (let i = rainDrops.length - 1; i >= 0; i--) {
    rainDrops[i].update();
    rainDrops[i].draw();
    if (rainDrops[i].offscreen()) rainDrops.splice(i, 1);
  }
}
