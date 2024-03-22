// Get the canvas and its 2D rendering context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Resize the canvas to fit the window
window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
  canvas.width = window.innerWidth - 2;
  canvas.height = window.innerHeight - 1;
}
resizeCanvas();

// Arrays to store boundaries, rays, and light source
let boundaries = [];
let rays = [];
let light;

// Number of rays to cast
let rayCount = 900; // Current number of rays being cast

// Variables for touch event handling
let tapTime = 0;
let tapTimeout;

// Wall color
let wallColor = 'black';

// Maze dimensions
let mazeRows = 11;
let mazeCols = 21;
let cellWidth = canvas.width / mazeCols;
let cellHeight = canvas.height / mazeRows;

// Calculate the position of the top left corner of the maze
let mazeStartX = cellWidth;
let mazeStartY = cellHeight;

// Field of view for the light source
let fov = 60;
let viewDirection = 0;

// Variables to store the previous mouse position
let prevMouseX = 0;

// Movement for the light source
const moveSpeed = 0.005;
let moveUp = false;
let moveDown = false;
let moveLeft = false;
let moveRight = false;

// Sensitivity factor for rotation speed
const sensitivity = 10;
let prevTime = performance.now(); // Track the previous time

// Class to create boundaries
class Boundaries {
  constructor(x1, y1, x2, y2, color){
    this.a = {x: x1, y: y1};
    this.b = {x: x2, y: y2};
    this.color = color;
  }

  // Method to draw boundaries
  draw(){
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }
}

// Initialize maze with all walls
let maze = new Array(mazeRows);
for (let i = 0; i < mazeRows; i++) {
  maze[i] = new Array(mazeCols).fill(1);
}

// Recursive function to carve paths
function carve(x, y) {
  // Define the carving directions
  let directions = [
    [-1, 0], // Up
    [1, 0], // Down
    [0, -1], // Left
    [0, 1] // Right
  ];

  // Randomize the directions
  directions.sort(() => Math.random() - 0.5);

  // Try carving in each direction
  for (let [dx, dy] of directions) {
    let nx = x + dx * 2;
    let ny = y + dy * 2;

    if (nx >= 0 && nx < mazeRows && ny >= 0 && ny < mazeCols && maze[nx][ny] === 1) {
      maze[x + dx][y + dy] = 0;
      maze[nx][ny] = 0;
      carve(nx, ny);
    }
  }
}

// Start carving from the upper-left corner
carve(1, 1);
// Generate optimized boundaries for the maze
for (let i = 0; i < mazeRows; i++) {
  for (let j = 0; j < mazeCols; j++) {
    if (maze[i][j] === 1) {
      let x1 = j * cellWidth;
      let y1 = i * cellHeight;
      let x2 = (j + 1) * cellWidth;
      let y2 = (i + 1) * cellHeight;

      // Check the neighboring cells
      if (i > 0 && maze[i - 1][j] === 0) { // Top
        boundaries.push(new Boundaries(x1, y1, x2, y1, wallColor));
      }
      if (j > 0 && maze[i][j - 1] === 0) { // Left
        boundaries.push(new Boundaries(x1, y1, x1, y2, wallColor));
      }
      if (j < mazeCols - 1 && maze[i][j + 1] === 0) { // Right
        boundaries.push(new Boundaries(x2, y1, x2, y2, wallColor));
      }
      if (i < mazeRows - 1 && maze[i + 1][j] === 0) { // Bottom
        boundaries.push(new Boundaries(x1, y2, x2, y2, wallColor));
      }
    }
  }
}

// Class to create rays
class Rays {
  constructor(x, y, angle, color){
    this.pos = {x: x, y: y};
    this.dir = {x: Math.cos(angle), y: Math.sin(angle)};
    this.color = color;
  }

  // Method to draw rays
  draw(){
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + this.dir.x * 5, this.pos.y + this.dir.y * 5);
    ctx.strokeStyle = this.color;
    ctx.stroke();

    this.updatePos();

    this.update(this.pos.x + this.dir.x * 10, this.pos.y + this.dir.y * 10);
  }

  setAngle(angle){
    this.dir = {x: Math.cos(angle), y: Math.sin(angle)};
  }

  // Method to update ray direction
  update(x, y){
    this.dir.x = x - this.pos.x;
    this.dir.y = y - this.pos.y;

    const length = Math.sqrt(this.dir.x * this.dir.x + this.dir.y * this.dir.y);
    this.dir.x /= length;
    this.dir.y /= length;
  }

  // Method to cast ray and detect intersections with boundaries
  cast(bound){
    const x1 = bound.a.x;
    const y1 = bound.a.y;

    const x2 = bound.b.x;
    const y2 = bound.b.y;

    const x3 = this.pos.x;
    const y3 = this.pos.y;

    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const denominator = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    const numeratorT = (x1-x3)*(y3-y4) - (y1-y3)*(x3-x4);
    const numeratorU = -((x1-x2)*(y1-y3) - (y1-y2)*(x1-x3));

    if (denominator == 0){
      return;
    }

    const t = numeratorT / denominator;
    const u = numeratorU / denominator;

    if (t > 0 && t < 1 && u > 0){
      const point = {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      }
      return point;
    } else {
      return;
    }
  }

  updatePos() {
    const moveDirection = Math.atan2(Math.sin(viewDirection * Math.PI / 180), Math.cos(viewDirection * Math.PI / 180));
    const moveSpeedX = moveSpeed * Math.cos(moveDirection);
    const moveSpeedY = moveSpeed * Math.sin(moveDirection);
  
    if (moveUp) {
      light.pos.x += moveSpeedX;
      light.pos.y += moveSpeedY;
    } 
    if (moveDown) {
      light.pos.x -= moveSpeedX;
      light.pos.y -= moveSpeedY;
    }
    if (moveLeft) {
      light.pos.x += moveSpeedY;
      light.pos.y -= moveSpeedX;
    }
    if (moveRight) {
      light.pos.x -= moveSpeedY;
      light.pos.y += moveSpeedX;
    }
  }
}

// Class to create light sources
class lightSource {
  constructor(x, y, color, rayColor){
    this.pos = {x: x, y: y};
    this.rays = [];
    this.color = color;
    this.heading = 0;

    // Generate rays for the light source
    for (let i = viewDirection - fov/2; i < viewDirection + fov/2; i += (fov / rayCount)){
      this.rays.push(new Rays(this.pos.x, this.pos.y, i * Math.PI / 180, rayColor));
    }
  }

  // Method to draw light source and its rays
  draw(){
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    for(let ray of this.rays){
      ray.pos.x = this.pos.x;
      ray.pos.y = this.pos.y;
      ray.draw();
    }
  }

  // Method to spread rays and detect intersections with boundaries
  spread(){
    for (let ray of this.rays){
      let closest = null;
      let record = Infinity;

      for (let boundary of boundaries) {
        const point = ray.cast(boundary);
        if (point) {
          const distance = Math.hypot(this.pos.x - point.x, this.pos.y - point.y);
          if (distance < record) {
            record = distance;
            closest = point;
          }
        }
      }

      if (closest) {
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(closest.x, closest.y);
        ctx.strokeStyle = this.color;
        ctx.stroke();
      }
    }
  }

  move(x, y) {
    let newPos = { x: x, y: y };
    this.pos = newPos;
  }

  rotate(angle) {
    this.heading += angle;
    for (let ray of this.rays) {
      ray.update(this.pos.x + Math.cos(ray.dir.x + angle), this.pos.y + Math.sin(ray.dir.y + angle));
    }
  }
}

light = new lightSource(mazeStartX + 10, mazeStartY + 10, 'rgba(255, 255, 237, 0.03)', 'rgba(255, 255, 0, 0.8)');

window.addEventListener('keydown', (e) => {
  if (e.key === 'r') {
    light = new lightSource(mazeStartX + 10, mazeStartY + 10, 'rgba(255, 255, 237, 0.03)', 'rgba(255, 255, 0, 0.8)');
  }
  else if (e.key === 't') {
    wallColor = (wallColor === 'black') ? 'white' : 'black';
    for (let boundary of boundaries) {
      boundary.color = wallColor;
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    moveUp = true;
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    moveDown = true;
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    moveRight = true;
  } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    moveLeft = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    moveUp = false;
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    moveDown = false;
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    moveRight = false;
  } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    moveLeft = false;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const currentTime = performance.now();
  const deltaTime = currentTime - prevTime;
  const deltaX = e.clientX - prevMouseX;
  const speed = Math.abs(deltaX) / deltaTime; // Calculate mouse movement speed
  
  viewDirection += Math.sign(deltaX) * speed * sensitivity; // Adjust fov rotation based on mouse movement speed

  prevMouseX = e.clientX;
  prevTime = currentTime;
  
  // Ensure the view direction stays within 0 to 360 degrees
  if (viewDirection < 0) {
    viewDirection += 360;
  } else if (viewDirection >= 360) {
    viewDirection -= 360;
  }

  // Update the rays based on the new view direction
  light.rays = [];
  for (let i = viewDirection - fov/2; i < viewDirection + fov/2; i += (fov / rayCount)) {
    light.rays.push(new Rays(light.pos.x, light.pos.y, i * Math.PI / 180, 'rgba(255, 255, 0, 0.8)'));
  }
});

// Function to continuously draw on canvas
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  light.draw();
  light.spread();

  for (let boundary of boundaries){
    boundary.draw();
  }

  drawFPS(ctx);
  
  requestAnimationFrame(draw);
}

draw();