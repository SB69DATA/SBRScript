var SBRSPlayer = (function() {

  var SBRSPlayer = {};
  var sbrs = null;
  var canvas = null;
  var ctx = null;
  var bgCtx = null;
  var laneCtx = null;

  var CANVAS_WIDTH = 2048 / 2; // CANVASの横幅
  var CANVAS_HEIGHT = 2732 / 2; // CANVASの縦幅
  var CANVAS_CENTER_X = CANVAS_WIDTH / 2;

  var JUDGE_Y = 1104; // 判定位置のY座標
  var JUDGE_CIRCLE_SIDE_X = 272; // 判定サークルの画面端からの距離

  var LANE_TOP_Y = 406; // レーンの上部のY座標
  var LANE_BOTTOM_SIDE_X = 72; // レーンの下部の画面端からの距離
  var LANE_TOP_SIDE_X = 478; // レーンの上部の画面端からの距離

  var MAX_SE_PLAY = 10; // SEの最大同時再生数

  SBRSPlayer.sbrs = null; // sbrスクリプトオブジェクト

  var playData = {};
  SBRSPlayer.playData = playData; // プレイデータ

  var load = {};
  load.endFlag = false;

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
  load.img = img;

  var sound = {};
  sound.count = 0;
  sound.loadCount = 0;
  sound.loadErrorFlag = false;
  sound.bgm = null;
  sound.perfect = [];
  sound.good = [];
  sound.long = null;
  load.sound = sound;

  SBRSPlayer.load = load; // 読み込みデータ

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
      bgCtx = document.getElementById("bg").getContext("2d");
      laneCtx = document.getElementById("lane").getContext("2d");

      // キャンバスのサイズ設定
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      document.getElementById("bg").width = CANVAS_WIDTH;
      document.getElementById("bg").height = CANVAS_HEIGHT;
      document.getElementById("lane").width = CANVAS_WIDTH;
      document.getElementById("lane").height = CANVAS_HEIGHT;

      // パラメータから譜面のパス取得
      sbrsPath = location.search.match(/load=([^&]*)(&|$)/)[1];

      // 譜面読み込み
      SBRSPlayer.sbrs = SBRScript.load(sbrsPath, true, {

        // 読み込み成功
        load: function() {

          sbrs = SBRSPlayer.sbrs;

          // BGM読み込み
          sound.bgm = loadSound(SBRSPlayer.sbrs.soundUrl);
        },
        // 読み込み失敗
        error: function() {
          playerElement.innerHTML = "読み込みに失敗しました(load:" + decodeURI(sbrsPath) + ")";
        }
      });

      // イベント登録
      addEvent();

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

    // 効果音読み込み
    sound.perfect[0] = loadSound("se/perfect.ogg");
    sound.good[0] = loadSound("se/good.ogg");
    sound.long = loadSound("se/long.ogg");
    sound.perfect[0].addEventListener("load", function() {
      for (i = 1, iLen = MAX_SE_PLAY; i < iLen; i++) {
        sound.perfect[i] = new Audio(sound.perfect[0].src);
      }
    });
    sound.good[0].addEventListener("loadeddata", function() {
      for (i = 1, iLen = MAX_SE_PLAY; i < iLen; i++) {
        sound.good[i] = new Audio(sound.good[0].src);
      }
    });
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

    var sound = new Audio();

    sound.src = soundPath;
    sound.load();

    // 読み込み成功
    sound.addEventListener("loadeddata", function() {

      load.sound.loadCount++;

      // 読み込み完了チェック
      checkLoadEnd();
    });

    // 読み込み失敗
    sound.addEventListener("error", function() {
      load.sound.loadErrorFlag = true;
    });

    load.sound.count++;

    return sound;
  }

  var Sound = (function() {

    function Sound() {

    }

    return Sound;
  }());

  function checkLoadEnd() {
    if (load.img.count === load.img.loadCount /*&&
      load.sound.count === load.sound.loadCount*/) {
      load.endFlag = true;
    }
  }

  /* function draw
   * 解析した譜面データを元に、画面の描画を行います
   * 戻り値 : なし
   */
  function draw(time) {

    time = time ? time : getTime();

    // キャンバスクリア
    //ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    laneCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (load.endFlag) {
      // 全リソースの読み込み完了

      // 背景を描画
      drawBg();

      // レーンを描画
      drawLane();

      // マーカーを描画
      drawMarker();

      // 判定サークルを描画
      drawJudgeCircle();

    } else {
      // リソース読込中
      drawLoading();
    }

    requestAnimationFrame(draw);

  }

  //var grad;

  function drawBg() {
    bgCtx.drawImage(img.bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    /*
    grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, "rgb(0, 0, 0)");
    grad.addColorStop(1, "rgb(0, 0, 96)");
    ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = grad;
    ctx.fill();
    */
  }

  /* function drawLane
   * レーンを描画します
   * 戻り値 : なし
   */
  function drawLane() {

    var scale = 2.4;
    var topWidth = CANVAS_WIDTH - LANE_TOP_SIDE_X * 2;
    var bottomWidth = CANVAS_WIDTH - LANE_BOTTOM_SIDE_X * 2;
    var laneCount = sbrs.laneCount;
    var laneTopWidth = topWidth / (scale * laneCount + laneCount - 1) * scale;
    var laneTopBlankWidth = topWidth / (scale * laneCount + laneCount - 1);
    var laneBottomWidth = bottomWidth / (scale * laneCount + laneCount - 1) * scale;
    var laneBottomBlankWidth = bottomWidth / (scale * laneCount + laneCount - 1);
    var i, iLen;
    laneCtx.save();

    for (i = 0, iLen = laneCount; i < iLen; i++) {
    laneCtx.save();
        laneCtx.fillStyle = "#000";
      laneCtx.beginPath();
      laneCtx.moveTo(LANE_TOP_SIDE_X + (laneTopWidth + laneTopBlankWidth) * i, LANE_TOP_Y);
      laneCtx.lineTo(LANE_BOTTOM_SIDE_X + (laneBottomWidth + laneBottomBlankWidth) * i, CANVAS_HEIGHT);
      laneCtx.lineTo(LANE_BOTTOM_SIDE_X + (laneBottomWidth + laneBottomBlankWidth) * i + laneBottomWidth, CANVAS_HEIGHT);
      laneCtx.lineTo(LANE_TOP_SIDE_X + (laneTopWidth + laneTopBlankWidth) * i + laneTopWidth, LANE_TOP_Y);
      laneCtx.closePath();
    laneCtx.clip();
    laneCtx.drawImage(img.lane, 0, LANE_TOP_Y, CANVAS_WIDTH, CANVAS_HEIGHT);
    laneCtx.restore();
      //laneCtx.fill();
    }

    //laneCtx.globalCompositeOperation = "source-in";
    laneCtx.restore();
  }

  /* function drawMarker
   * マーカーを描画します
   * 戻り値 : なし
   */
  function drawMarker() {
    ctx.drawImageCenter(img.normalMarker, CANVAS_WIDTH / 2, 800, 100, 100);
  }

  /* function drawJudgeCircle
   * 判定サークルを描画します
   * 戻り値 : なし
   */
  function drawJudgeCircle() {
    ctx.drawImageCenter(img.judgeCircle, JUDGE_CIRCLE_SIDE_X, JUDGE_Y, 172, 172);
    ctx.drawImageCenter(img.judgeCircle, CANVAS_CENTER_X, JUDGE_Y, 172, 172);
    ctx.drawImageCenter(img.judgeCircle, CANVAS_WIDTH - JUDGE_CIRCLE_SIDE_X, JUDGE_Y, 172, 172);

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