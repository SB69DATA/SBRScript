var SBRSPlayer = (function() {

  var SBRSPlayer = {};
  var canvas = null;
  var ctx = null;

  var CANVAS_WIDTH = 2048 / 2; // CANVASの横幅
  var CANVAS_HEIGHT = 2732 / 2; // CANVASの縦幅
  var CANVAS_CENTER_X = CANVAS_WIDTH / 2;

  var JUDGE_Y = 1104; // 判定位置のY座標
  var JUDGE_CIRCLE_SIDE_X = 272; // 判定サークルの画面端からの距離

  var LANE_TOP_Y = 406; // レーンの上部のY座標
  var LANE_H = CANVAS_HEIGHT - LANE_TOP_Y; // レーンの高さ
  var LANE_BOTTOM_SIDE_X = 72; // レーンの下部の画面端からの距離
  var LANE_TOP_SIDE_X = 478; // レーンの上部の画面端からの距離
  var LANE_DIFF_SIDE_X = LANE_BOTTOM_SIDE_X - LANE_TOP_SIDE_X; // レーン上部と下部の画面端からの距離の差
  var LANE_WIDTH_RATIO = 2.4; // レーンの間の間隔に対するレーン幅の比率

  var SPEAKER_Y = 386; // スピーカーのY座標

  var MAX_SE_PLAY = 10; // SEの最大同時再生数

  var PLAY_MIN_WAIT_TIME = -2000; // 演奏開始前の最小待機時間

  var sbrs = null; // sbrスクリプトオブジェクト
  SBRSPlayer.sbrs = null;

  var state = 0; // プレイヤーの状態(0:初期化 1:読込中 2:画像読み込み完了 3:待機中 4:演奏中 5:演奏終了)
  SBRSPlayer.state = state;

  var playData = {};
  SBRSPlayer.playData = playData; // プレイデータ

  var load = {};
  load.endFlag = false;
  SBRSPlayer.load = load; // 読み込み関連データ

  var img = {};
  img.count = 0;
  img.loadCount = 0;
  img.loadErrorFlag = false;

  img.bg = null;
  img.normalMarker = null;
  img.sameMarker = null;
  img.longMarker = null;
  img.longLine = null;
  img.judgeCircle = null;
  img.lane = null;
  img.insideSpeaker = null;
  img.outsideSpeaker = null;
  load.img = img;

  var sound = {};
  sound.count = 0;
  sound.loadCount = 0;
  sound.loadErrorFlag = false;
  sound.bgm = null;
  sound.perfect = null;
  sound.good = null;
  sound.long = null;
  load.sound = sound;

  // 汎用
  var marker;
  var time, diffTime;
  var x, y, w, h;
  var size;
  var sideX, intervalWidth, ratio;

  // レーン関連
  var laneCount;
  var laneTopAllWidth;
  var laneTopWidth;
  var laneTopBlankWidth;
  var laneTopIntervalWidth;
  var laneBottomAllWidth;
  var laneBottomWidth;
  var laneBottomBlankWidth;
  var laneBottomIntervalWidth;
  var laneDiffWidth;
  var laneDiffIntervalWidth;

  // 判定サークル関連
  var judgeCircleSize;
  var judgeCircleSideX;
  var judgeCircleIntervalWidth;

  /* function getTime
   * 現在時刻をミリ秒で取得します
   * 戻り値 : 現在時刻(ミリ秒)
   */
  var getTime = (function() {
    if (window.performance && performance.now) {
      return function() {
        return performance.now();
      };
    } else {
      return function() {
        return Date.now();
      };
    }
  }());

  window.addEventListener("DOMContentLoaded", function() {

    var playerElement = document.getElementById("player");
    var sbrsPath;

    try {

      // キャンバスとコンテキスト取得
      canvas = document.getElementById("main");
      ctx = canvas.getContext("2d");

      // キャンバスのサイズ設定
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      // パラメータから譜面のパス取得
      sbrsPath = location.search.match(/load=([^&]*)(&|$)/)[1];

      // ステータスを読込中に
      state = 1;

      // 譜面読み込み
      SBRSPlayer.sbrs = SBRScript.load(sbrsPath, true, {

        // 読み込み成功
        load: function() {

          // BGM読み込み
          sound.bgm = loadSound(SBRSPlayer.sbrs.soundUrl);

          // 読み込み完了チェック
          checkLoadEnd();
        },
        // 読み込み失敗
        error: function() {
          playerElement.innerHTML = "読み込みに失敗しました(load:" + decodeURI(sbrsPath) + ")";
        }
      });

      sbrs = SBRSPlayer.sbrs;

      // イベント登録
      addEvent();

      // SoundJS初期化
      initSoundJs();

      // リソース読み込み
      loadResource();

      // 画面描画
      draw();

    } catch (e) {
      playerElement.innerHTML = "パラメータエラー";
      console.error(e.stack);
    }
  });

  /* function addEvent
   * イベントを登録します
   * 戻り値 : なし
   */
  function addEvent() {

    window.addEventListener("touchstart", function(e) {
      e.preventDefault();
    });

    // 入力イベント
    canvas.addEventListener("touchstart", inputStart);
    canvas.addEventListener("touchmove", inputMove);
    canvas.addEventListener("touchend", inputEnd);
    canvas.addEventListener("touchcancel", inputEnd);
    window.addEventListener("keydown", inputStart);
    window.addEventListener("keyup", inputEnd);
    canvas.addEventListener("mousedown", inputStart);
    canvas.addEventListener("mousemove", inputMove);
    canvas.addEventListener("mouseup", inputEnd);
  }

  /* function inputStart
   * 入力開始処理を行います
   * 戻り値 : なし
   */
  function inputStart() {

    var pageTime = getTime();

    switch (state) {
      case 3: // 待機中
        inputWaitStart(pageTime);
        break;
      case 4: // 演奏中
        inputPlayStart();
        break;
      case 5: // 演奏終了
        break;
      case 0: // 初期化
      case 1: // 読込中
      case 2: // 画像読み込み完了
        SBRSPlayer.load.sound.perfect.play(true, 0, 0, 0, 1);
        break;
      default:
        throw new Error("state error");
    }
  }

  /* function inputStart
   * 入力待機中の入力処理を行います
   * 戻り値 : なし
   */
  function inputWaitStart(pageTime) {

    // 音声再生開始
    if (sbrs.offset < PLAY_MIN_WAIT_TIME) {
      SBRSPlayer.load.sound.bgm.play("none", 0, 0, 0, 1);
    } else {
      SBRSPlayer.load.sound.bgm.play("none", sbrs.offset - PLAY_MIN_WAIT_TIME, 0, 0, 1);
    }

    // ステータスを演奏中に
    state = 4;

    // 演奏開始時間を設定
    playData.startTime = sbrs.offset < PLAY_MIN_WAIT_TIME ? pageTime - sbrs.offset : pageTime - PLAY_MIN_WAIT_TIME;
  }

  /* function inputStart
   * 演奏中の入力処理を行います
   * 戻り値 : なし
   */
  function inputPlayStart() {
    SBRSPlayer.load.sound.perfect.play("early", 0, 0, 0, 1);

  }

  /* function inputMove
   * 入力中の移動処理を行います
   * 戻り値 : なし
   */
  function inputMove() {

  }

  /* function inputEnd
   * 入力終了処理を行います
   * 戻り値 : なし
   */
  function inputEnd() {

  }

  /* function initSoundJs
   * SoundJSの初期化を行います
   * 戻り値 : なし
   */
  function initSoundJs() {
    createjs.Sound.alternateExtensions = ["wav", "mp3"];
    createjs.Sound.on("fileload", function(e) {
      console.log("fileload");
      load.sound.loadCount++;

      // 読み込み完了チェック
      checkLoadEnd();
    });

    createjs.Sound.on("fileerror", function() {
      console.log("fileerror");
      load.sound.loadErrorFlag = true;
      alert("fileerror");
    });
  }

  /* function loadResource
   * リソースの読み込みを行います
   * 戻り値 : なし
   */
  function loadResource() {

    var i, iLen;

    // 読み込み数リセット
    load.img.count = 0;
    load.img.loadCount = 0;
    load.img.loadErrorFlag = false;
    load.sound.count = 0;
    load.sound.loadCount = 0;
    load.sound.loadErrorFlag = false;
    load.endFlag = false;

    // 画像読み込み
    img.bg = loadImg("img/bg.png");
    img.normalMarker = loadImg("img/normal-marker.png");
    img.sameMarker = loadImg("img/same-marker.png");
    img.longMarker = loadImg("img/long-marker.png");
    img.longLine = null;
    img.judgeCircle = loadImg("img/judge-circle.png");
    img.lane = loadImg("img/lane.png");
    img.insideSpeaker = loadImg("img/inside-speaker.png");
    img.outsideSpeaker = loadImg("img/outside-speaker.png");

    // 効果音読み込み
    sound.perfect = loadSound("se/perfect.wav");
    sound.good = loadSound("se/good.wav");
    sound.long = loadSound("se/long.wav");
  }

  /* function loadImg
   * 画像の読み込みを行います
   * 戻り値 : Imageオブジェクト
   */
  function loadImg(imgPath) {

    var image = new Image();

    image.src = imgPath;

    // 読み込み成功
    image.addEventListener("load", function() {

      load.img.loadCount++;

      // 読み込み完了チェック
      checkLoadEnd();
    });

    // 読み込み失敗
    image.addEventListener("error", function() {
      load.img.loadErrorFlag = true;
    });

    load.img.count++;

    return image;
  }

  /* function loadSound
   * 音声の読み込みを行います
   * 戻り値 : Audioオブジェクト
   */
  function loadSound(soundPath) {

    var sound = createjs.Sound.registerSound(soundPath, soundPath);
    var instance = createjs.Sound.createInstance(soundPath);

    if (sound === false) {
      // 読み込み失敗
      console.log("fileerror");
      load.sound.loadErrorFlag = true;
    }

    load.sound.count++;

    return instance;
  }

  var Sound = (function() {

    function Sound() {

    }

    return Sound;
  }());

  /* function checkLoadEnd
   * 読み込みの完了確認を行います
   * 戻り値 : なし
   */
  function checkLoadEnd() {

    if (load.img.count === load.img.loadCount) {
      state = 2;
    }

    if (load.img.count === load.img.loadCount &&
      load.sound.count === load.sound.loadCount &&
      sbrs.readyState === 4
    ) {
      state = 3;
      load.endFlag = true;
      initPlay();
    }
  }

  /* function initPlay
   * 演奏開始前の初期化処理を行います
   * 戻り値 : なし
   */
  function initPlay() {

    // レーン関連
    laneTopAllWidth = CANVAS_WIDTH - LANE_TOP_SIDE_X * 2;
    laneBottomAllWidth = CANVAS_WIDTH - LANE_BOTTOM_SIDE_X * 2;
    laneCount = sbrs.laneCount;
    laneTopWidth = laneTopAllWidth / (LANE_WIDTH_RATIO * laneCount + laneCount - 1) * LANE_WIDTH_RATIO;
    laneTopBlankWidth = laneTopAllWidth / (LANE_WIDTH_RATIO * laneCount + laneCount - 1);
    laneTopIntervalWidth = laneTopWidth + laneTopBlankWidth;
    laneBottomWidth = laneBottomAllWidth / (LANE_WIDTH_RATIO * laneCount + laneCount - 1) * LANE_WIDTH_RATIO;
    laneBottomBlankWidth = laneBottomAllWidth / (LANE_WIDTH_RATIO * laneCount + laneCount - 1);
    laneBottomIntervalWidth = laneBottomWidth + laneBottomBlankWidth;
    laneDiffWidth = laneBottomWidth - laneTopWidth;
    laneDiffIntervalWidth = laneBottomIntervalWidth - laneTopIntervalWidth;

    // 判定サークル関連
    judgeCircleSize = laneTopWidth + (laneBottomWidth - laneTopWidth) * ((JUDGE_Y - LANE_TOP_Y) / LANE_H);
    judgeCircleSideX = LANE_TOP_SIDE_X - (LANE_TOP_SIDE_X - LANE_BOTTOM_SIDE_X) * ((JUDGE_Y - LANE_TOP_Y) / LANE_H) + judgeCircleSize / 2;
    judgeCircleIntervalWidth = (laneTopIntervalWidth + (laneBottomIntervalWidth - laneTopIntervalWidth) * ((JUDGE_Y - LANE_TOP_Y) / LANE_H));
  }

  /* function draw
   * 解析した譜面データを元に、画面の描画を行います
   * 戻り値 : なし
   */
  function draw(pageTime) {

    pageTime = pageTime ? pageTime : getTime();

    if (state === 4) {
      time = pageTime - playData.startTime;
    } else {
      time = sbrs.offset < PLAY_MIN_WAIT_TIME ? sbrs.offset : PLAY_MIN_WAIT_TIME;
    }

    switch (state) {
      case 3: // 待機中

      case 4: // 演奏中

        // 背景を描画
        drawBg();

        // レーンを描画
        drawLane();

        // マーカーを描画
        drawMarker(time);

        // スピーカーを描画
        drawSpeaker();

        // 判定サークルを描画
        drawJudgeCircle();

        // ctx.fillStyle = "#fff";
        // ctx.font = "30px 'ＭＳ Ｐゴシック'";
        // ctx.fillText(time, 0, 30);

        break;
      case 5: // 演奏終了
        break;
      case 0: // 初期化
      case 1: // 読込中
      case 2: // 画像読み込み完了
        drawLoading();
        break;
      default:
        throw new Error("state error");
    }

    requestAnimationFrame(draw);

  }

  //var grad;

  function drawBg() {
    ctx.drawImage(img.bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /* function drawLane
   * レーンを描画します
   * 戻り値 : なし
   */
  function drawLane() {
    for (i = 0, iLen = laneCount; i < iLen; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(LANE_TOP_SIDE_X + laneTopIntervalWidth * i, LANE_TOP_Y);
      ctx.lineTo(LANE_BOTTOM_SIDE_X + laneBottomIntervalWidth * i, CANVAS_HEIGHT);
      ctx.lineTo(LANE_BOTTOM_SIDE_X + laneBottomIntervalWidth * i + laneBottomWidth, CANVAS_HEIGHT);
      ctx.lineTo(LANE_TOP_SIDE_X + laneTopIntervalWidth * i + laneTopWidth, LANE_TOP_Y);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img.lane, 0, LANE_TOP_Y, CANVAS_WIDTH, LANE_H);
      ctx.restore();
    }
  }

  /* function drawMarker
   * マーカーを描画します
   * 戻り値 : なし
   */
  function drawMarker(time) {

    var i, iLen;

    for (i = 0, iLen = sbrs.markerCount; i < iLen; i++) {

      marker = sbrs.marker[i];

      diffTime = marker.time - time;

      marker.scroll = 0.2;

      var speed = diffTime * marker.bpm * marker.scroll / 120;
      if(diffTime * marker.bpm * marker.scroll > 1200 * 120) {
        continue;
      }
      y = JUDGE_Y - speed + (speed * speed) / 2900;

      //y = JUDGE_Y - diffTime * marker.bpm * marker.scroll / 50 + Math.pow(diffTime * marker.bpm * marker.scroll, 2) * 0.0000001;
      //y = JUDGE_Y - diffTime * marker.bpm * marker.scroll / 300 + diffTime * diffTime * 0.0006;
      //y = diffTime * marker.bpm * marker.scroll / 400 - Math.pow(diffTime * marker.bpm * marker.scroll, 2.0) / 400000000 + JUDGE_Y;

      // judgeCircleSize = laneTopWidth + (laneBottomWidth - laneTopWidth) * ((JUDGE_Y - LANE_TOP_Y) / (CANVAS_HEIGHT - LANE_TOP_Y));
      // judgeCircleSideX = LANE_TOP_SIDE_X - (LANE_TOP_SIDE_X - LANE_BOTTOM_SIDE_X) * ((JUDGE_Y - LANE_TOP_Y) / (CANVAS_HEIGHT - LANE_TOP_Y)) + judgeCircleSize / 2;
      // judgeCircleIntervalWidth = (laneTopIntervalWidth + (laneBottomIntervalWidth - laneTopIntervalWidth) * ((JUDGE_Y - LANE_TOP_Y) / (CANVAS_HEIGHT - LANE_TOP_Y)));
      // if(i === 50) {
      //   console.log(y)
      // }

      if (y > CANVAS_HEIGHT + 150) {
        //continue;
      }
      if (y < LANE_TOP_Y) {
        //break;
      }
      //laneDiffWidth = laneBottomWidth - laneTopWidth;
      //laneDiffIntervalWidth = laneBottomIntervalWidth - laneTopIntervalWidth;

      //judgeCircleIntervalWidth = 
      //(laneTopIntervalWidth + (laneBottomIntervalWidth - laneTopIntervalWidth) * ((JUDGE_Y - LANE_TOP_Y) / LANE_H));

      ratio = (y - LANE_TOP_Y) / LANE_H;
      size = laneTopWidth + laneDiffWidth * ratio;
    //var markerSize = laneTopWidth + (laneBottomWidth - laneTopWidth) * ((JUDGE_Y - LANE_TOP_Y) / LANE_H);
      //y += size*size;
      x = LANE_TOP_SIDE_X + LANE_DIFF_SIDE_X * ratio + (laneDiffIntervalWidth) * ratio * (marker.lane - 1) + size / 2 + laneTopIntervalWidth * (marker.lane - 1);

      switch (marker.type) {
        case 1:
          if (marker.same) {
            ctx.drawImageCenter(img.sameMarker, x, y, size, size);
          } else {
            ctx.drawImageCenter(img.normalMarker, x, y, size, size);
          }
          break;
        case 2:
          ctx.drawImageCenter(img.longMarker, x, y, size, size);
          break;
        case 3:
          ctx.drawImageCenter(img.longMarker, x, y, size, size);
          break;
        default:
          break;
      }
    }
  }

  /* function drawSpeaker
   * スピーカーを描画します
   * 戻り値 : なし
   */
  function drawSpeaker() {
    ctx.drawImageCenter(img.outsideSpeaker, CANVAS_WIDTH / 2, SPEAKER_Y);
    ctx.drawImageCenter(img.insideSpeaker, CANVAS_WIDTH / 2, SPEAKER_Y);
  }

  /* function drawJudgeCircle
   * 判定サークルを描画します
   * 戻り値 : なし
   */
  function drawJudgeCircle() {
    for (i = 0, iLen = laneCount; i < iLen; i++) {
      ctx.drawImageCenter(img.judgeCircle, judgeCircleSideX + judgeCircleIntervalWidth * i, JUDGE_Y, judgeCircleSize, judgeCircleSize);
    }
  }

  /* function drawLoad
   * 読み込み中画面の描画を行います
   * 戻り値 : なし
   */
  function drawLoading() {

  }

  CanvasRenderingContext2D.prototype.drawImageCenter = function(image, x, y, w, h, x1, y2, w2, h2) {

    switch (arguments.length) {
      case 3:
        ctx.drawImage(image, x - image.width / 2, y - image.height / 2);
        break;
      case 5:
        ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
        break;
      case 9:
        ctx.drawImage(image, x, y, w, h, x1 - w2 / 2, y2 - h2 / 2, w2, h2);
        break;
      default:
        throw new Error();
    }
  };

  return SBRSPlayer;
}());

/*
window.addEventListener("DOMContentLoaded", function() {

  sound = [];
  function loadSound(soundPath, id) {
    /*
   createjs.Sound.registerSound(soundPath, id);
   if(typeof callbackLoadSound === "function") {
     callbackLoadSound(sound.loaded, sound.count);
   }
   sound.count++;aaaaa*

    function loadCmp(event) {
        alert(0)
      var item = event.item;
      //sound.loaded++;
      if(item && createjs.LoadQueue.SOUND === item.type){
        createjs.Sound.createInstance(id);
        createjs.Sound.play(id);
        //se[id].play(true, 0, 0, 0, 1, 0);
        queue.removeEventListener("fileload", loadCmp);
        queue.removeEventListener("error", loadCmp);
      }
      // if(sound.loaded === sound.count) {
      //   sound.readyState = 4;
      //   //checkState();
      // }
      if(typeof callbackLoadSound === "function") {
        callbackLoadSound(sound.loaded, sound.count);
      }
    }
    var queue = new createjs.LoadQueue(true);
    queue.installPlugin(createjs.Sound);
    queue.loadManifest({src:soundPath, id:id}, true);
    queue.addEventListener('fileload', loadCmp);
    queue.addEventListener('error', loadCmp);
    if(typeof callbackLoadSound === "function") {
      //callbackLoadSound(sound.loaded, sound.count);
    }
  }
  loadSound("sbrs/恋詠桜.mp3", "sbrs/恋詠桜.mp3");

});
*/