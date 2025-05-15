import { PRELOAD_CONFIG } from "..";
import { Player } from "../entities/Player";
import type { SpriteWithDynamicBody } from "../types";
import { GameScene } from "./GameScene";

class PlayScene extends GameScene {
  player!: Player;
  ground!: Phaser.GameObjects.TileSprite;
  obstacles!: Phaser.Physics.Arcade.Group;
  clouds!: Phaser.GameObjects.Group;
  startTrigger!: SpriteWithDynamicBody;

  highScoreText!: Phaser.GameObjects.Text;
  scoreText!: Phaser.GameObjects.Text;
  gameOverText!: Phaser.GameObjects.Image;
  restartText!: Phaser.GameObjects.Image;
  gameOverContainer!: Phaser.GameObjects.Container;

  score: number = 0;
  scoreInterval: number = 100;
  scoreDeltaTime: number = 0;

  spawnInterval: number = 1500;
  spawnTime: number = 0;
  gameSpeed: number = 5;
  gameSpeedModifier: number = 1;

  progressSound!: Phaser.Sound.HTML5AudioSound;

  constructor() {
    super("PlayScene");
  }

  create() {
    this.createEnvironment();
    this.createPlayer();
    this.createObstacles();
    this.createGameoverContainer();
    this.createAnimations();
    this.createScore();

    this.handleGameStart();
    this.handleObstacleCollisions();
    this.handleGameRestart();

    this.progressSound = this.sound.add("progress", { volume: 0.2 }) as Phaser.Sound.HTML5AudioSound;
  }

  update(_time: number, delta: number): void {
    if (!this.isGameRunning) {
      return;
    }

    this.spawnTime += delta;
    this.scoreDeltaTime += delta;

    if (this.scoreDeltaTime >= this.scoreInterval) {
      this.score++;
      this.scoreDeltaTime = 0;

      if (this.score % 100 === 0) {
        this.gameSpeedModifier += 0.2;
        this.progressSound.play();
        this.tweens.add({
          targets: this.scoreText,
          duration: 100,
          repeat: 3,
          alpha: 0,
          yoyo: true,
        });
      }
    }

    if (this.spawnTime >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTime = 0;
    }

    Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed * this.gameSpeedModifier);
    Phaser.Actions.IncX(this.clouds.getChildren(), -0.5);

    const digits = Array.from(String(this.score), Number);
    while (digits.length < 5) digits.unshift(0);
    this.scoreText.setText(digits.join(""));

    this.obstacles.getChildren().forEach((obj) => {
      const obstacle = obj as SpriteWithDynamicBody;
      if (obstacle.getBounds().right < 0) {
        this.obstacles.remove(obstacle);
      }
    });

    this.clouds.getChildren().forEach((obj) => {
      const cloud = obj as SpriteWithDynamicBody;
      if (cloud.getBounds().right < 0) {
        cloud.x = this.gameWidth + 30;
      }
    });

    this.ground.tilePositionX += this.gameSpeed * this.gameSpeedModifier;
  }

  createPlayer() {
    this.player = new Player(this, 0, this.gameHeight);
  }

  createEnvironment() {
    this.ground = this.add
      .tileSprite(0, this.gameHeight, 88, 26, "ground")
      .setOrigin(0, 1);

    this.clouds = this.add.group().addMultiple([
      this.add.image(this.gameWidth / 2, 170, "cloud"),
      this.add.image(this.gameWidth - 80, 80, "cloud"),
      this.add.image(this.gameWidth / 1.3, 100, "cloud"),
    ]);

    this.clouds.setAlpha(0);
  }

  createObstacles() {
    this.obstacles = this.physics.add.group();
  }

  createGameoverContainer() {
    this.gameOverText = this.add.image(0, 0, "game-over");
    this.restartText = this.add.image(0, 80, "restart").setInteractive();

    this.gameOverContainer = this.add
      .container(this.gameWidth / 2, this.gameHeight / 2 - 50)
      .add([this.gameOverText, this.restartText])
      .setAlpha(0);
  }

  createAnimations() {
    this.anims.create({
      key: "enemy-bird-fly",
      frames: this.anims.generateFrameNumbers("enemy-bird"),
      frameRate: 6,
      repeat: -1,
    });
  }

  createScore() {
    this.scoreText = this.add
      .text(this.gameWidth, 0, "00000", {
        fontSize: 30,
        fontFamily: "Arial",
        color: "#535353",
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);

    this.highScoreText = this.add
      .text(this.scoreText.getBounds().left - 20, 0, "00000", {
        fontSize: 30,
        fontFamily: "Arial",
        color: "#535353",
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);
  }

  spawnObstacle() {
    const total = PRELOAD_CONFIG.cactusesCount + PRELOAD_CONFIG.birdsCount;
    const num = Phaser.Math.Between(1, total);
    const dist = Phaser.Math.Between(150, 300);
    let obstacle;

    if (num > PRELOAD_CONFIG.cactusesCount) {
      const heights = [20, 70];
      const h = heights[Phaser.Math.Between(0, 1)];
      obstacle = this.obstacles.create(this.gameWidth + dist, this.gameHeight - h, "enemy-bird");
      obstacle.play("enemy-bird-fly", true);
    } else {
      obstacle = this.obstacles.create(this.gameWidth + dist, this.gameHeight, `obstacle-${num}`);
    }

    obstacle.setOrigin(0, 1).setImmovable();
  }

  handleGameStart() {
    this.startTrigger = this.physics.add.sprite(0, 10, "");
    this.startTrigger
      .setAlpha(0)
      .setOrigin(0, 1);

    this.physics.add.overlap(this.startTrigger, this.player, () => {
      if (this.startTrigger.y === 10) {
        this.startTrigger.body.reset(0, this.gameHeight);
        return;
      }

      this.startTrigger.body.reset(9999, 9999);
      const roll = this.time.addEvent({
        delay: 1000 / 60,
        loop: true,
        callback: () => {
          this.player.playRunAnimation();
          this.player.setVelocityX(80);
          this.ground.width += 34;

          if (this.ground.width >= this.gameWidth) {
            roll.remove();
            this.ground.width = this.gameWidth;
            this.player.setVelocityX(0);
            this.clouds.setAlpha(1);
            this.scoreText.setAlpha(1);
            this.isGameRunning = true;
          }
        },
      });
    });
  }

  handleGameRestart() {
    this.restartText.on("pointerdown", () => {
      this.physics.resume();
      this.player.setVelocityY(0);
      this.obstacles.clear(true, true);
      this.gameOverContainer.setAlpha(0);
      this.anims.resumeAll();
      this.isGameRunning = true;
    });
  }

  handleObstacleCollisions() {
    this.physics.add.collider(this.obstacles, this.player, () => {
      this.isGameRunning = false;
      this.physics.pause();
      this.anims.pauseAll();
      this.player.die();
      this.gameOverContainer.setAlpha(1);

      const prevHI = this.highScoreText.text.slice(-5);
      const current = Number(this.scoreText.text);
      const newHI = current > Number(prevHI) ? this.scoreText.text : prevHI;

      this.highScoreText.setText("HI " + newHI).setAlpha(1);
      this.spawnTime = 0;
      this.score = 0;
      this.scoreDeltaTime = 0;
      this.gameSpeedModifier = 1;
    });
  }
}

export default PlayScene;
