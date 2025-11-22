//some constants related to the initial generation of the world
const levelW = 800;
const levelH = 450;
const chunkSize = 50;
const tileRes = 8;
const noiseStep = 0.001;
const grav = 0.015;
const coyoteFrames = 6;

//images
var inventorySlot;
var inventorySlot_Sel;

//variables to adjust the view of the game
var zoom = 16;
var UIUnit;
var viewOffset;
var playerOffset;

//mouse position data
var mousePos;
var mouseChunkPos;
var mousePosInChunk;

//information about the player
var selectedSlot = 0;
var inventory = [];
var playerPos;
var playerChunkPos;
var playerPosInChunk;
var playerVelocity;
var grounded = true;
var moveDir = 0;
var jumpSpeed = 0.5;
var moveSpeed = 0.1;
var coyoteCount;

//array containing block information about the game world
var levelData = [];
//array of chunks
var chunks = [];
//list of available blocks
const blockLib = [
  air = {
    solid : false,
    blend : false,
    id : 0
  },
  dirt = {
    spriteSheet : null,
    sprites : [],
    solid : true,
    blend : true,
    id : 1
  },
  grass = {
    spriteSheet : null,
    sprites : [],
    solid : true,
    blend : true,
    id : 2
  },
  stone = {
    spriteSheet : null,
    sprites : [],
    solid : true,
    blend : true,
    id : 3
  },
  torch = {
    spriteSheet : null,
    sprites : [],
    solid : false,
    blend : false,
    id : 4
  }
];
//list of available items
const itemLib = [
  pickaxe = {
    id : 0,
    useType : 0,
    tile : null,
    icon : null
  },
  dirtItem = {
    id : 1,
    useType : 1,
    tile : 1,
    icon : null
  },
  torchItem = {
    id : 2,
    useType : 1,
    tile : 4,
    icon : null
  }
]
//size of a single block
var tileUnit;

//misc
var paused = false;
var gameState = 0;

//lighting
var lightmap;
/*------------------------------------------------------------------------*/

function preload() {
  inventorySlot = loadImage('Images/UI/Inventory_Back.png');
  inventorySlot_Sel = loadImage('Images/UI/Inventory_Back_Sel.png');
  for (let i = 0; i < itemLib.length; i++) {
    itemLib[i].icon = loadImage('Images/Items/Item_' + i + '.png');
  }
  for (let i = 0; i < blockLib.length; i++) {
    if(i != 0) {
      blockLib[i].spriteSheet = loadImage('Images/Tiles/Tile_' + i + '.png');
    }
  }
}

function setup() {
  //console.log(blockLib[1].sprites)
  //noLoop()
  // createCanvas(windowWidth, windowWidth / 2); NOTE: This is what the line was originally. Changed for ease of demonstration
  createCanvas(windowHeight * 2, windowHeight);
  //set tileUnit such that with zero scaling the world will fill the width of the canvas
  tileUnit = width / levelW * zoom;
  UIUnit = width / 400;

  for (let i = 0; i < blockLib.length; i++) {
    if (blockLib[i].id != 0) {
      if (blockLib[i].blend == true) {
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 12; x++) {
            //console.log(y + (x * 9))
            blockLib[i].sprites[x + (y * 12)] = [];
            for (let y1 = 0; y1 < tileRes; y1++) {
              for (let x1 = 0; x1 < tileRes; x1++) {
                blockLib[i].sprites[x + (y * 12)].push(blockLib[i].spriteSheet.get(x*tileRes + x1,y*tileRes + y1))
              }
            }
          }
        }
      }
      else {
        for (let y = 0; y < tileRes; y++) {
          for (let x = 0; x < tileRes; x++) {
            blockLib[i].sprites.push(blockLib[i].spriteSheet.get(x,y));
          }
        }
      }
    }
  }
  
  //give player starting items
  inventory[0] = itemLib[0];
  inventory[1] = itemLib[1];
  inventory[2] = itemLib[2];
  
  //lightmap = createImage(int(width/20), int(height/20));

  initVectors();

  translate(width / 2, height / 2);
  GenerateTerrain();
  for (let x = 0; x < levelW / chunkSize; x++) {
    for (let y = 0; y < levelH / chunkSize; y++) {
      chunks[x][y].draw();
    }
  }
}

function draw() {
  switch(gameState) {
      case(0) :
      startScreen();
      break;
      case(1) :
      gameLoop();
      break;
  }
}

function startScreen() {
  background(220);
  push();
  textAlign(CENTER, BOTTOM);
  textSize(width * 0.08);
  text('2D sandbox game', width/2, height/3);
  if(mouseX > (width * 20) / 46 && mouseX < width - ((width * 20) / 46) && mouseY < height / 2 && mouseY > height * 12 / 32) {
    push();
    stroke(255);
    strokeWeight(width * 0.005)
    fill(100);
    textSize(width * 0.055);
    text('Play', width/2, height / 2);
    pop();
  } else {
    push();
    fill(60);
    textSize(width * 0.055);
    text('Play', width/2, height / 2);
    pop();
  }
  pop();
}

function gameLoop() {
  if(!paused) {
    if(!grounded) {
      coyoteCount++;
    }
    else {
      coyoteCount = 0;
    }
    background(190,220,255);

    getPlayerPos();

    GetMousePosInWorld();

    gravity();

    updatePlayerPos();

    cameraLock();

    push();
    translate(playerOffset.x * tileUnit, playerOffset.y * tileUnit);

    push();
    translate(viewOffset.x * tileUnit, viewOffset.y * tileUnit);

    for (let x = 0; x < levelW / chunkSize; x++) {
      for (let y = 0; y < levelH / chunkSize; y++) {
        chunks[x][y].draw();
      }
    }
    pop();

    push();

    /*
    line(0,height/2,width,height/2)
    line(width/2,0,width/2,height)
    */

    translate(width / 2,height / 2);
    rect(-tileUnit / 2, -tileUnit * 2, tileUnit, (2 * tileUnit));
    pop();
    pop();
    
    //drawLighting();
    
    drawHotbar();
  }
}

function drawHotbar() {
  push()
  noSmooth();
  for(let i = 0; i < 10; i++) {
    if(i == selectedSlot) {
      image(inventorySlot_Sel, ((UIUnit * (inventorySlot.width/5) + UIUnit/2) * i) + UIUnit/2, UIUnit * 6, UIUnit * (inventorySlot.width/5), UIUnit * (inventorySlot.width/5));
    }
    else {
      image(inventorySlot, ((UIUnit * (inventorySlot.width/5) + UIUnit/2) * i) + UIUnit/2, UIUnit * 6, UIUnit * (inventorySlot.width/5), UIUnit * (inventorySlot.width/5));
    }
    if(inventory[i] != null) {
      image(inventory[i].icon, ((UIUnit * (inventorySlot.width/5) + UIUnit/2) * i) + UIUnit/2 + (inventorySlot.width/2/5) * UIUnit - (inventory[i].icon.width/2/5) * UIUnit, UIUnit * 6 + (inventorySlot.width/2/5) * UIUnit - (inventory[i].icon.height/2/5) * UIUnit, UIUnit * (inventory[i].icon.width/5), UIUnit * (inventory[i].icon.height/5));
    }
  }
  pop();
}

//apply gravity to the player
function gravity() {
  if(!grounded) {
    playerVelocity.y -= grav;
  }
  /*else {
    playerVelocity.y = 0;
  }*/
}

//move the player based on playerVelocity
function updatePlayerPos() {
  //let currentChunk = chunks[int((playerPos.x - tileUnit/2)/50)][int((playerPos.y - tileUnit/2)/50)];
  playerOffset.y = 0;
  playerOffset.x = 0;
  viewOffset.y += playerVelocity.y;
  viewOffset.x += playerVelocity.x;

  getPlayerPos();
  detectWorldEdges();
  getPlayerPos();
  leftCollision();
  getPlayerPos();
  rightCollision();
  getPlayerPos();
  ceilingCollision();
  getPlayerPos();
  stepUpCollision();
  getPlayerPos();
  floorCollision();
  getPlayerPos();
}

//prevent the camera from leaking past the edges of the world
function cameraLock() {
  //console.log(tileFromPixel(0, height).y)
  playerOffset.y = 0;
  playerOffset.x = 0;
  while(tileFromPixel(0, 0.01).y < 0) {
    playerOffset.y -= 0.001;
  }
  while(tileFromPixel(0, height).y > levelH) {
    playerOffset.y += 0.001;
  }
  while(tileFromPixel(0.01, 0).x < 0) {
    playerOffset.x -= 0.01;
  }
  while(tileFromPixel(width, 0).x > levelW) {
    playerOffset.x += 0.001;
  }
  //console.log(tileFromPixel(0, height).y)
}

//functions to handle player collsion
/*------------------------------------------------------------------------*/
function detectWorldEdges() {
  if(playerPos.x < 0.5 || playerPos.x > (levelW - 0.5)) {
    //console.log(playerPos.x)
    viewOffset.x -= playerVelocity.x;
  }
  if(playerPos.y < 2) {
    viewOffset.y -= playerVelocity.y;
    playerVelocity.y = 0;
  }
}
function floorCollision() {
  if(playerPos.y >= levelH) {
    viewOffset.y -= playerVelocity.y
    playerVelocity.y = 0;
    grounded = true;
  }
  else {
    if(chunks[int((playerPos.x - 0.4) / chunkSize)][int(playerPos.y / chunkSize)].collision[int(playerPos.x - 0.4) - (int((playerPos.x - 0.4) / chunkSize) * chunkSize)][int(playerPos.y) - int(playerPos.y / chunkSize) * chunkSize] == 1 || chunks[int((playerPos.x + 0.4) / chunkSize)][int(playerPos.y / chunkSize)].collision[int(playerPos.x + 0.4) - (int((playerPos.x + 0.4) / chunkSize) * chunkSize)][int(playerPos.y) - int(playerPos.y / chunkSize) * chunkSize] == 1) {
      playerVelocity.y = 0;
      grounded = true;
      viewOffset.y+= playerPos.y - int(playerPos.y);
    }
    else {
      grounded = false;
    }
  }
}
function stepUpCollision() {
  if(chunks[int((playerPos.x - 0.4) / chunkSize)][int((playerPos.y - 1) / chunkSize)].collision[int(playerPos.x - 0.4) - (int((playerPos.x - 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 1) - int((playerPos.y - 1) / chunkSize) * chunkSize] == 1) {
    if(chunks[int((playerPos.x - 0.4) / chunkSize)][int((playerPos.y - 2) / chunkSize)].collision[int(playerPos.x - 0.4) - (int((playerPos.x - 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 2) - int((playerPos.y - 2) / chunkSize) * chunkSize] == 0 && chunks[int((playerPos.x - 0.4) / chunkSize)][int((playerPos.y - 3) / chunkSize)].collision[int(playerPos.x - 0.4) - (int((playerPos.x - 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 3) - int((playerPos.y - 3) / chunkSize) * chunkSize] == 0 && chunks[int((playerPos.x) / chunkSize)][int((playerPos.y - 3) / chunkSize)].collision[int(playerPos.x) - (int((playerPos.x) / chunkSize) * chunkSize)][(int(playerPos.y) - 3) - int((playerPos.y - 3) / chunkSize) * chunkSize] == 0) {
      if(!grounded) {
        viewOffset.x -= playerVelocity.x;
      }
      else {
        viewOffset.y += playerPos.y - int(playerPos.y) + 1;
      }
    }
    else {
      viewOffset.x -= playerVelocity.x;
    }
  }
  else if(chunks[int((playerPos.x + 0.4) / chunkSize)][int((playerPos.y - 1) / chunkSize)].collision[int(playerPos.x + 0.4) - (int((playerPos.x + 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 1) - int((playerPos.y - 1) / chunkSize) * chunkSize] == 1) {
    if(chunks[int((playerPos.x + 0.4) / chunkSize)][int((playerPos.y - 2) / chunkSize)].collision[int(playerPos.x + 0.4) - (int((playerPos.x + 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 2) - int((playerPos.y - 2) / chunkSize) * chunkSize] == 0 && chunks[int((playerPos.x + 0.4) / chunkSize)][int((playerPos.y - 3) / chunkSize)].collision[int(playerPos.x + 0.4) - (int((playerPos.x + 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 3) - int((playerPos.y - 3) / chunkSize) * chunkSize] == 0 && chunks[int((playerPos.x) / chunkSize)][int((playerPos.y - 3) / chunkSize)].collision[int(playerPos.x) - (int((playerPos.x) / chunkSize) * chunkSize)][(int(playerPos.y) - 3) - int((playerPos.y - 3) / chunkSize) * chunkSize] == 0) {
      if(!grounded) {
        viewOffset.x -= playerVelocity.x;
      }
      else {
        viewOffset.y += playerPos.y - int(playerPos.y) + 1;
      }
    }
    else {
      viewOffset.x -= playerVelocity.x;
    }
  }
}
function ceilingCollision() {
  if(chunks[int((playerPos.x - 0.4) / chunkSize)][int((playerPos.y - 2) / chunkSize)].collision[int(playerPos.x - 0.4) - (int((playerPos.x - 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 2) - int((playerPos.y - 2) / chunkSize) * chunkSize] == 1) {
    viewOffset.y += playerPos.y - int(playerPos.y) - 1;
    playerVelocity.y = 0;
  }
  else if(chunks[int((playerPos.x + 0.4) / chunkSize)][int((playerPos.y - 2) / chunkSize)].collision[int(playerPos.x + 0.4) - (int((playerPos.x + 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 2) - int((playerPos.y - 2) / chunkSize) * chunkSize] == 1) {
    viewOffset.y += playerPos.y - int(playerPos.y) - 1;
    playerVelocity.y = 0;
  }
}
function leftCollision() {
  if(chunks[int((playerPos.x - 0.4) / chunkSize)][int((playerPos.y - 2) / chunkSize)].collision[int(playerPos.x - 0.4) - (int((playerPos.x - 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 2) - int((playerPos.y - 2) / chunkSize) * chunkSize] == 1) {
    viewOffset.x -= playerVelocity.x;
    //playerVelocity.x = 0;
  }
}
function rightCollision() {
  if(chunks[int((playerPos.x + 0.4) / chunkSize)][int((playerPos.y - 2) / chunkSize)].collision[int(playerPos.x + 0.4) - (int((playerPos.x + 0.4) / chunkSize) * chunkSize)][(int(playerPos.y) - 2) - int((playerPos.y - 2) / chunkSize) * chunkSize] == 1) {
    viewOffset.x -= playerVelocity.x;
    //playerVelocity.x = 0;
  }
}
/*------------------------------------------------------------------------*/

//input functions
/*------------------------------------------------------------------------*/
function mousePressed() {
  //console.log(mousePos)
  switch(gameState) {
      case(0) :
      if(mouseX > (width * 20) / 46 && mouseX < width - ((width * 20) / 46) && mouseY < height / 2 && mouseY > height * 12 / 32 && mouseButton == LEFT) {
        gameState = 1;
      }
      break;
      case(1) :
      if(mouseButton == LEFT) {
        switch(inventory[selectedSlot].useType) {
        case(0) :
          if(chunks[mouseChunkPos.x][mouseChunkPos.y].blocks[mousePosInChunk.x][mousePosInChunk.y].id != 0) {
            chunks[mouseChunkPos.x][mouseChunkPos.y].blocks[mousePosInChunk.x][mousePosInChunk.y] = blockLib[0];
            translate(width / 2, height / 2);
            reloadChunksManual();
          }
          break;
        case(1) :
          if(chunks[mouseChunkPos.x][mouseChunkPos.y].blocks[mousePosInChunk.x][mousePosInChunk.y].id == 0) {
            chunks[mouseChunkPos.x][mouseChunkPos.y].blocks[mousePosInChunk.x][mousePosInChunk.y] = blockLib[inventory[selectedSlot].tile];
            translate(width / 2, height / 2);
            reloadChunksManual();
          }
          break;
        }
      }
      break;
  }
}

function keyPressed() {
  switch(keyCode) {
    case(49) :
      selectedSlot = 0;
      break;
    case(50) :
      selectedSlot = 1;
      break;
    case(51) :
      selectedSlot = 2;
      break;
    case(52) :
      selectedSlot = 3;
      break;
    case(53) :
      selectedSlot = 4;
      break;
    case(54) :
      selectedSlot = 5;
      break;
    case(55) :
      selectedSlot = 6;
      break;
    case(56) :
      selectedSlot = 7;
      break;
    case(57) :
      selectedSlot = 8;
      break;
    case(48) :
      selectedSlot = 9;
      break;
    case(32) :
      if(coyoteCount <= coyoteFrames) {
        grounded = false;
        playerVelocity.y += jumpSpeed;
      }
      break;
    case(65) :
        playerVelocity.x += moveSpeed;
      break;
    case(68) :
        playerVelocity.x -= moveSpeed;
  }
}
function keyReleased() {
  switch(keyCode) {
    case(68) :
        playerVelocity.x += moveSpeed;
      break;
    case(65) :
        playerVelocity.x -= moveSpeed;
  }
}
/*------------------------------------------------------------------------*/

//terrain generation functions
/*------------------------------------------------------------------------*/
function GenerateTerrain() {

  firstPass();
  stonePass();
  cavePass();
  grassPass();

  let index = 0;
  for (let x = 0; x < levelW / chunkSize; x++) {
    chunks[x] = [];
    for (let y = 0; y < levelH / chunkSize; y++) {
      chunks[x][y] = new chunk(index, x, y);
      index++;
    }
  }
  for (let x = 0; x<levelW/chunkSize;x++) {
    for (let y = 0; y<levelH/chunkSize;y++) {
      chunks[x][y].getCollisions();
      //chunks[x][y].reload();
    }
  }
  for (let x = 0; x<levelW/chunkSize;x++) {
    for (let y = 0; y<levelH/chunkSize;y++) {
      chunks[x][y].reload();
    }
  }
}

function firstPass() {

  for(let x = 0; x < levelW; x++) {
    levelData[x] = [];
    for(let y = 0; y < levelH; y++) {
      let n = noise(x * noiseStep / (levelW/800));
      n *= 1 - noise(x * 0.005 + 12 / (levelW/800));
      n = map(n, 0, 1, 0.3, 0.5, true);
      if(y>n*levelH) {
        levelData[x][y] = blockLib[1];
      }
      else {
        levelData[x][y] = blockLib[0];
      }
      //bg.set(x,y,levelData[x][y].colour)
    }
  }
}
function stonePass() {

  for(let x = 0; x < levelW; x++) {
    for(let y = 0; y < levelH;y++) {
      let n = noise(x * 0.003 + 342 / (levelW/800));
      n *= 1 - noise(x * 0.0065 + 214 / (levelW/800));
      n = map(n, 0, 1, 0.5, 0.7, true);
      if(y > n * levelH) {
        levelData[x][y] = blockLib[3];
      }
    }
  }
}
function cavePass() {
  push();
  noiseDetail(1);
  for(let x = 0; x < levelW; x++) {
    for(let y = 0; y < levelH; y++) {
      let n = noise(x * 0.01 / (levelW/800) * 5, y * 0.01 / (levelH/450) * 5);
      n*=noise(x * 0.015 / (levelW/800) * 5, y * 0.015 / (levelH/450) * 5);
      n*=noise(x * 0.0085 / (levelW/800) * 5, y * 0.0085 / (levelH/450) * 5);

      n*=y/levelH;
      n*=12.5;

      if(n < 0.145) {
      }
      else {
        levelData[x][y] = blockLib[0];
      }
    }
  }
  pop();
}
function grassPass() {

  for(let x = 0; x < levelW; x++) {
    for(let y = 0; y < levelH; y++) {
      if(levelData[x][y].id == 1 && levelData[x][y - 1].id == 0) {
        levelData[x][y] = blockLib[2];
      }
      //bg.set(x,y,levelData[x][y].colour)
    }
  }
}
/*------------------------------------------------------------------------*/

//lighting
/*------------------------------------------------------------------------*/
function drawLighting() {
  push();
  noSmooth();
  lightmap.loadPixels();
  for(let x = 0; x < width/20; x++) {
    for(let y = 0; y < height/20; y++) {
      n = tileFromPixel(x * 20,y * 20);
      if(chunks[int(n.x/50)][int(n.y/50)].collision[int(n.x) - (int(n.x/50) * 50)][int(n.y) - (int(n.y/50) * 50)] == 1) {
        lightmap.set(x,y, color(0,0,0,128))
      }
      else {
        lightmap.set(x,y, color(0,0,0,0))
      }
    }
  }
  lightmap.updatePixels();
  image(lightmap, 0, 0, width, height);
  pop()
}
/*------------------------------------------------------------------------*/

//miscellaneous functions
/*------------------------------------------------------------------------*/
function GetMousePosInWorld() {
  mousePos = tileFromPixel(mouseX, mouseY)
  mousePos.x = int(mousePos.x);
  mousePos.y = int(mousePos.y);

  //divide x1 and y1 by chunkSize to get the index of the current chunk being modified, and store that as a vector2
  mouseChunkPos = createVector(int(mousePos.x / chunkSize),int(mousePos.y / chunkSize));

  //multiply chunkSize by the chunk index on a particular axis, and subtract that from the transformed mouse position on the same axis to get the mouse position relative to the current chunk
  mousePosInChunk = createVector(mousePos.x - chunkSize * mouseChunkPos.x, mousePos.y - chunkSize * mouseChunkPos.y);
}

function tileFromPixel(x, y) {
  //variables to center the cursor coordinates on the screen
  //zoom-1 means it will only have an effect if the game is zoomed in, solving an issue with an offset when the zoom is 1(not zoomed in)
  let nW = zoom - 1;
  let nH = zoom - 1;
  //multiply by half the canvas size on each axis
  nW *= width / 2;
  nH *= height / 2;
  //divide by zoom to cancel it out
  //nW /= zoom;
  //nH /= zoom;
  //divide by tileUnit to convert to co-ordinates in tiles
  nW /= tileUnit;
  nH /= tileUnit;

  //store mouse position into variables
  let x1 = x;
  let y1 = y;
  //divide by zoom to cancel it out
  //x1 /= zoom;
  //y1 /= zoom;
  //divide by tileUnit to get the tile co-ordinates
  x1 /= tileUnit;
  y1 /= tileUnit;
  //add adjustment variables2
  x1 += nW;
  y1 += nH;
  //add the view offset to account for scrolling
  x1 -= viewOffset.x;
  y1 -= viewOffset.y;
  //account for screen edges
  x1 -= playerOffset.x;
  y1 -= playerOffset.y;
  return createVector(x1, y1);
}
function pixelFromTile(x, y) {
  //mousePosInChunk = createVector(mousePos.x - chunkSize * mouseChunkPos.x, mousePos.y - chunkSize * mouseChunkPos.y);
  let nW = zoom - 1;
  let nH = zoom - 1;

  nW *= width / 2;
  nH *= height / 2;

  //nW /= zoom;
  //nH /= zoom;

  nW /= tileUnit;
  nH /= tileUnit;

  let x1 = x;
  let y1 = y;

  x1 += playerOffset.x;
  y1 += playerOffset.y;

  x1 += viewOffset.x;
  y1 += viewOffset.y;

  x1 -= nW;
  y1 -= nH;

  x1 /= tileUnit;
  y1 /= tileUnit;

  //x1 /= zoom;
  //y1 /= zoom;
  return createVector(x1, y1);
}

function initVectors() {
  viewOffset = createVector(0, 100);
  playerOffset = createVector(0, 0);
  playerVelocity = createVector(0, 0);
}

function getPlayerPos() {
  playerPos = tileFromPixel(width/2 + (playerOffset.x * tileUnit),height/2 + (playerOffset.y * tileUnit));
  playerChunkPos = createVector(int(playerPos.x / chunkSize), int(playerPos.y / chunkSize));
  playerPosInChunk = createVector(playerPos.x - chunkSize * playerChunkPos.x, playerPos.y - chunkSize * playerChunkPos.y);
}

function getTileState(chunkX, chunkY, x, y) {
  let chunk = chunks[chunkX][chunkY].collision;
  //let flat = [].concat.apply([], chunk)
  let index = (chunk[x][y] == 1 && x < chunkSize-1 && x > 0 && y < chunkSize-1 && y > 0) ? (
                  (chunk[x][y - 1]) | 
                  (chunk[x + 1][y - 1] && chunk[x][y - 1] && chunk[x + 1][y] << 1) | 
                  (chunk[x + 1][y] << 2) |
                  (chunk[x + 1][y + 1] && chunk[x][y + 1] && chunk[x + 1][y] << 3) |
                  (chunk[x][y + 1] << 4) |
                  (chunk[x - 1][y + 1] && chunk[x][y + 1] && chunk[x - 1][y] << 5) |
                  (chunk[x - 1][y] << 6) |
                  (chunk[x - 1][y - 1] && chunk[x][y - 1] && chunk[x - 1][y] << 7)
                  ) 
              : 255;
  if (x == chunkSize - 1 && chunkX < (levelW / 50) - 1 && chunks[chunkX + 1][chunkY].collision[x] != null) {
    index = (chunk[x][y] == 1 && y < chunkSize-1 && y > 0) ? (
                  (chunk[x][y - 1]) | 
                  (chunks[chunkX + 1][chunkY].collision[0][y - 1] && chunk[x][y - 1] && chunks[chunkX + 1][chunkY].collision[0][y] << 1) | 
                  (chunks[chunkX + 1][chunkY].collision[0][y] << 2) |
                  (chunks[chunkX + 1][chunkY].collision[0][y + 1] && chunk[x][y + 1] && chunks[chunkX + 1][chunkY].collision[0][y] << 3) |
                  (chunk[x][y + 1] << 4) |
                  (chunk[x - 1][y + 1] && chunk[x][y + 1] && chunk[x - 1][y] << 5) |
                  (chunk[x - 1][y] << 6) |
                  (chunk[x - 1][y - 1] && chunk[x][y - 1] && chunk[x - 1][y] << 7)
                  ) 
              : 255;
  } else if (x == 0 && chunkX > 0 && chunks[chunkX - 1][chunkY].collision[x] != null) {
    index = (chunk[x][y] == 1 && y < chunkSize-1 && y > 0) ? (
                  (chunk[x][y - 1]) | 
                  (chunk[x + 1][y - 1] && chunk[x][y - 1] && chunk[x + 1][y] << 1) | 
                  (chunk[x + 1][y] << 2) |
                  (chunk[x + 1][y + 1] && chunk[x][y + 1] && chunk[x + 1][y] << 3) |
                  (chunk[x][y + 1] << 4) |
                  (chunks[chunkX - 1][chunkY].collision[chunkSize - 1][y + 1] && chunk[x][y + 1] && chunks[chunkX - 1][chunkY].collision[chunkSize - 1][y] << 5) |
                  (chunks[chunkX - 1][chunkY].collision[chunkSize - 1][y] << 6) |
                  (chunks[chunkX - 1][chunkY].collision[chunkSize - 1][y - 1] && chunk[x][y - 1] && chunks[chunkX - 1][chunkY].collision[chunkSize - 1][y] << 7)
                  ) 
              : 255;
  }
  if (y == chunkSize - 1 && chunkY < (levelH / 50) - 1 && chunks[chunkX][chunkY + 1].collision[x][y] != null) {
    index = (chunk[x][y] == 1 && x < chunkSize-1 && x > 0 && y > 0) ? (
                  (chunk[x][y - 1]) | 
                  (chunk[x + 1][y - 1] && chunk[x][y - 1] && chunk[x + 1][y] << 1) | 
                  (chunk[x + 1][y] << 2) |
                  (chunks[chunkX][chunkY + 1].collision[x + 1][0] && chunks[chunkX][chunkY + 1].collision[x][0] && chunk[x + 1][y] << 3) |
                  (chunks[chunkX][chunkY + 1].collision[x][0] << 4) |
                  (chunks[chunkX][chunkY + 1].collision[x - 1][0] && chunks[chunkX][chunkY + 1].collision[x][0] && chunk[x - 1][y] << 5) |
                  (chunk[x - 1][y] << 6) |
                  (chunk[x - 1][y - 1] && chunk[x][y - 1] && chunk[x - 1][y] << 7)
                  ) 
              : 255;
  } else if (y == 0 && chunkY > 0 && chunks[chunkX][chunkY - 1].collision[x][y] != null) {
    index = (chunk[x][y] == 1 && x < chunkSize-1 && x > 0 && y < chunkSize-1) ? (
                  (chunks[chunkX][chunkY - 1].collision[x][chunkSize - 1]) | 
                  (chunks[chunkX][chunkY - 1].collision[x + 1][chunkSize - 1] && chunks[chunkX][chunkY - 1].collision[x][chunkSize - 1] && chunk[x + 1][y] << 1) | 
                  (chunk[x + 1][y] << 2) |
                  (chunk[x + 1][y + 1] && chunk[x][y + 1] && chunk[x + 1][y] << 3) |
                  (chunk[x][y + 1] << 4) |
                  (chunk[x - 1][y + 1] && chunk[x][y + 1] && chunk[x - 1][y] << 5) |
                  (chunk[x - 1][y] << 6) |
                  (chunks[chunkX][chunkY - 1].collision[x - 1][chunkSize - 1] && chunks[chunkX][chunkY - 1].collision[x][chunkSize - 1] && chunk[x - 1][y] << 7)
                  ) 
              : 255;
  }
  return index;
}

function reloadChunksManual() {
  chunks[mouseChunkPos.x][mouseChunkPos.y].reload();
  if(mousePosInChunk.x == 0 && mouseChunkPos.x != 0) {
    chunks[mouseChunkPos.x - 1][mouseChunkPos.y].reload();
  }
  if(mousePosInChunk.x == chunkSize - 1 && mouseChunkPos.x != chunks.lenght - 1) {
    chunks[mouseChunkPos.x + 1][mouseChunkPos.y].reload();
  }
  if(mousePosInChunk.y == 0 && mouseChunkPos.y != 0) {
    chunks[mouseChunkPos.x][mouseChunkPos.y - 1].reload();
  }
  if(mousePosInChunk.y == chunkSize -1 && mouseChunkPos.y != chunks[0].length - 1) {
    chunks[mouseChunkPos.x][mouseChunkPos.y + 1].reload();
  }
}
/*------------------------------------------------------------------------*/

class chunk {
  constructor(id, posx, posy) {
    this.id = id;
    this.pos = createVector(posx, posy);
    this.blocks = [];
    this.collision = [];
    this.img = createImage(chunkSize * tileRes, chunkSize * tileRes);
    this.lightMask = createImage(chunkSize * tileRes, chunkSize * tileRes);
    for (let x = 0; x < chunkSize; x++) {
      this.blocks[x] = [];
      for (let y = 0; y < chunkSize; y++) {
        this.blocks[x][y] = levelData[x + (chunkSize * posx)][y + (chunkSize * posy)];
      }
    }
  }
  //reload the chunk
  reload() {
    this.getCollisions();
    //this.updateLight();
    this.img.loadPixels();
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let x1 = 0; x1 < tileRes; x1++) {
          for (let y1 = 0; y1 < tileRes; y1++) {
            if (this.blocks[x][y].blend == true) {
              switch(getTileState(this.pos.x,this.pos.y,x,y)) {
                  case(0) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[0][x1 + (y1 * tileRes)]);
                  break;
                  case(1) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[36][x1 + (y1 * tileRes)]);
                  break;
                  case(4) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[1][x1 + (y1 * tileRes)]);
                  break;
                  case(5) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[16][x1 + (y1 * tileRes)]);
                  break;
                  case(7) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[37][x1 + (y1 * tileRes)]);
                  break;
                  case(16) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[12][x1 + (y1 * tileRes)]);
                  break;
                  case(17) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[24][x1 + (y1 * tileRes)]);
                  break;
                  case(20) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[4][x1 + (y1 * tileRes)]);
                  break;
                  case(21) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[6][x1 + (y1 * tileRes)]);
                  break;
                  case(23) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[30][x1 + (y1 * tileRes)]);
                  break;
                  case(28) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[13][x1 + (y1 * tileRes)]);
                  break;
                  case(29) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[28][x1 + (y1 * tileRes)]);
                  break;
                  case(31) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[25][x1 + (y1 * tileRes)]);
                  break;
                  case(64) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[3][x1 + (y1 * tileRes)]);
                  break;
                  case(65) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[17][x1 + (y1 * tileRes)]);
                  break;
                  case(68) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[2][x1 + (y1 * tileRes)]);
                  break;
                  case(69) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[18][x1 + (y1 * tileRes)]);
                  break;
                  case(71) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[40][x1 + (y1 * tileRes)]);
                  break;
                  case(80) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[5][x1 + (y1 * tileRes)]);
                  break;
                  case(81) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[19][x1 + (y1 * tileRes)]);
                  break;
                  case(84) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[7][x1 + (y1 * tileRes)]);
                  break;
                  case(85) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[46][x1 + (y1 * tileRes)]);
                  break;
                  case(87) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[8][x1 + (y1 * tileRes)]);
                  break;
                  case(92) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[31][x1 + (y1 * tileRes)]);
                  break;
                  case(93) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[9][x1 + (y1 * tileRes)]);
                  break;
                  case(95) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[23][x1 + (y1 * tileRes)]);
                  break;
                  case(112) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[15][x1 + (y1 * tileRes)]);
                  break;
                  case(113) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[43][x1 + (y1 * tileRes)]);
                  break;
                  case(116) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[29][x1 + (y1 * tileRes)]);
                  break;
                  case(117) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[21][x1 + (y1 * tileRes)]);
                  break;
                  case(119) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[34][x1 + (y1 * tileRes)]);
                  break;
                  case(124) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[14][x1 + (y1 * tileRes)]);
                  break;
                  case(125) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[22][x1 + (y1 * tileRes)]);
                  break;
                  case(127) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[45][x1 + (y1 * tileRes)]);
                  break;
                  case(193) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[39][x1 + (y1 * tileRes)]);
                  break;
                  case(197) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[42][x1 + (y1 * tileRes)]);
                  break;
                  case(199) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[38][x1 + (y1 * tileRes)]);
                  break;
                  case(209) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[41][x1 + (y1 * tileRes)]);
                  break;
                  case(213) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[20][x1 + (y1 * tileRes)]);
                  break;
                  case(215) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[11][x1 + (y1 * tileRes)]);
                  break;
                  case(221) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[35][x1 + (y1 * tileRes)]);
                  break;
                  case(223) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[33][x1 + (y1 * tileRes)]);
                  break;
                  case(241) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[27][x1 + (y1 * tileRes)]);
                  break;
                  case(245) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[10][x1 + (y1 * tileRes)]);
                  break;
                  case(247) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[32][x1 + (y1 * tileRes)]);
                  break;
                  case(253) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[44][x1 + (y1 * tileRes)]);
                  break;
                  case(255) :
                  this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[26][x1 + (y1 * tileRes)]);
                  break;
                /*
              0 1 4 5 7 16 17 20 21 23 28 29 31 64 65 68 69 71 80 81 84 85 87 92 93 95 112 113 116 117 119 124 125 127 193 197 199 209 213 215 221 223 241 245 247 253 255
              */
              }
            } else if (this.blocks[x][y].id != 0) {
              this.img.set((x * tileRes) + x1, (y * tileRes) + y1, this.blocks[x][y].sprites[x1 + (y1 * tileRes)] )
            } else {
              this.img.set((x * tileRes) + x1, (y * tileRes) + y1, color(0,0,0,0));
            }
          }
        }
      }
    }
    this.img.updatePixels();
    //this.img.blend(this.lightMask, 0, 0, chunkSize*tileRes,chunkSize*tileRes,0,0,chunkSize*tileRes,chunkSize*tileRes, MULTIPLY)
    //getTileState(this.pos.x,this.pos.y,0,0)
  }
  /*updateLight() {
    //this.lightMask.resize(chunkSize,0);
    this.lightMask.loadPixels();
    for (let x = 0; x < chunkSize; x++) {
      let n = 0;
      let lock = false;
      for (let y = 0; y < chunkSize; y++) {
        if (this.collision[x][y] == 0 && lock == false) {
          n = y;
          for (let x1 = 0; x1 < tileRes; x1++) {
            for (let y1 = 0; y1 < tileRes; y1++) {
              this.lightMask.set(x * tileRes + x1,y * tileRes + y1, color(0,0,0,0));
            }
          }
        }
        else {
          if(this.collision[x][y - 1] == 0 && y == n+1) {
            switch(y) {
                case(chunkSize-1) :
                for (let x1 = 0; x1 < tileRes; x1++) {
                  for (let y1 = 0; y1 < tileRes; y1++) {
                    this.lightMask.set(x * tileRes + x1,y * tileRes + y1, color(0,0,0,0));
                  }
                }
                break;
                case(chunkSize-2) :
                for (let x1 = 0; x1 < tileRes; x1++) {
                  for (let y1 = 0; y1 < tileRes; y1++) {
                    this.lightMask.set(x * tileRes + x1, y * tileRes + y1, 255/sq(1 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 1) * tileRes + y1, 255/sq(2 + (y1/tileRes)));
                  }
                }
                y++
                break;
                case(chunkSize-3) :
                for (let x1 = 0; x1 < tileRes; x1++) {
                  for (let y1 = 0; y1 < tileRes; y1++) {
                    this.lightMask.set(x * tileRes + x1, y * tileRes + y1, 255/sq(1 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 1) * tileRes + y1, 255/sq(2 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 2) * tileRes + y1, 255/sq(3 + (y1/tileRes)));
                  }
                }
                y+=2
                break;
                case(chunkSize-4) :
                for (let x1 = 0; x1 < tileRes; x1++) {
                  for (let y1 = 0; y1 < tileRes; y1++) {
                    this.lightMask.set(x * tileRes + x1, y * tileRes + y1, 255/sq(1 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 1) * tileRes + y1, 255/sq(2 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 2) * tileRes + y1, 255/sq(3 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 3) * tileRes + y1, 255/sq(4 + (y1/tileRes)));
                  }
                }
                y+=3
                break;
                default :
                for (let x1 = 0; x1 < tileRes; x1++) {
                  for (let y1 = 0; y1 < tileRes; y1++) {
                    this.lightMask.set(x * tileRes + x1, y * tileRes + y1, 255/sq(1 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 1) * tileRes + y1, 255/sq(2 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 2) * tileRes + y1, 255/sq(3 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 3) * tileRes + y1, 255/sq(4 + (y1/tileRes)));
                    this.lightMask.set(x * tileRes + x1, (y + 4) * tileRes + y1, 255/sq(5 + (y1/tileRes)));
                  }
                }
                y+=4
            }
            lock = true;
          }
          else {
            if(y == 0) {
              lock = true;
            }
            for (let x1 = 0; x1 < tileRes; x1++) {
              for (let y1 = 0; y1 < tileRes; y1++) {
                this.lightMask.set(x * tileRes + x1, y * tileRes + y1, 0);
              }
            }
          }
          //break;
        }
      }
    }
    this.lightMask.updatePixels();
    //this.lightMask.resize(chunkSize*tileRes,0)
  }*/
  getCollisions() {
    for (let x = 0; x < chunkSize; x++) {
      this.collision[x] = [];
      for (let y = 0; y < chunkSize; y++) {
        if(this.blocks[x][y].solid == false) {
          this.collision[x][y] = int(0);
        }
        else {
          this.collision[x][y] = int(1);
        }
      }
    }
  }
  //draw the chunk
  draw() {
    push();
    noSmooth();
    translate(-width / 2 * (zoom - 1), -height / 2 * (zoom - 1));
    translate((tileUnit * chunkSize) * this.pos.x, (tileUnit * chunkSize) * this.pos.y);
    noStroke();
    image(this.img, 0, 0, (tileUnit * chunkSize), (tileUnit * chunkSize));
    pop();
  }
}
