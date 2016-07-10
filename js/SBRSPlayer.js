var SBRSPlayer = (function() {

  var SBRSPlayer = {};
  var sbrs = null;
  var canvas = null;
  var ctx = null;

  var CANVAS_WIDTH = 2048 / 2; // CANVASの横幅
  var CANVAS_HEIGHT = 2732 / 2; // CANVASの縦幅
  var CANVAS_CENTER_X = CANVAS_WIDTH / 2;

  var JUDGE_Y = 1104; // 判定位置のY座標
  var JUDGE_CIRCLE_SIDE_X = 272; // 判定サークルの画面端からの距離
  //var JUDGE_CIRCLE_SIZE = 172; // 判定サークルのサイズ

  var LANE_TOP_Y = 406; // レーンの上部のY座標
  var LANE_BOTTOM_SIDE_X = 72; // レーンの下部の画面端からの距離
  var LANE_TOP_SIDE_X = 478; // レーンの上部の画面端からの距離
  var LANE_WIDTH_RATIO = 2.4; // レーンの間の間隔に対するレーン幅の比率

  var SPEAKER_Y = 386; // スピーカーのY座標

  var MAX_SE_PLAY = 10; // SEの最大同時再生数

  SBRSPlayer.sbrs = null; // sbrスクリプトオブジェクト

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
  sound.perfect = [];
  sound.good = [];
  sound.long = null;
  load.sound = sound;

  // 汎用
  var i, iLen;

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
    img.insideSpeaker = loadImg("img/inside-speaker.png");
    img.outsideSpeaker = loadImg("img/outside-speaker.png");

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

  /* function checkLoadEnd
   * 読み込みの完了確認を行います
   * 戻り値 : なし
   */
  function checkLoadEnd() {
    if (load.img.count === load.img.loadCount
      /*&&
           load.sound.count === load.sound.loadCount*/
    ) {
      initPlay();
    }
  }

  /* function initPlay
   * 演奏開始前の初期化処理を行います
   * 戻り値 : なし
   */
  function initPlay() {
    load.endFlag = true;

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

    // 判定サークル関連
    judgeCircleSize = laneTopWidth + (laneBottomWidth - laneTopWidth) * ((JUDGE_Y - LANE_TOP_Y) / (CANVAS_HEIGHT - LANE_TOP_Y));
    judgeCircleSideX = LANE_TOP_SIDE_X - (LANE_TOP_SIDE_X - LANE_BOTTOM_SIDE_X) * ((JUDGE_Y - LANE_TOP_Y) / (CANVAS_HEIGHT - LANE_TOP_Y)) + judgeCircleSize / 2;
    judgeCircleIntervalWidth = (laneTopIntervalWidth + (laneBottomIntervalWidth - laneTopIntervalWidth) * ((JUDGE_Y - LANE_TOP_Y) / (CANVAS_HEIGHT - LANE_TOP_Y)));
  }

  /* function draw
   * 解析した譜面データを元に、画面の描画を行います
   * 戻り値 : なし
   */
  function draw(time) {

    time = time ? time : getTime();

    if (load.endFlag) {
      // 全リソースの読み込み完了

      // 背景を描画
      drawBg();

      // レーンを描画
      drawLane();

      // マーカーを描画
      drawMarker();

      // スピーカーを描画
      drawSpeaker();

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
      ctx.drawImage(img.lane, 0, LANE_TOP_Y, CANVAS_WIDTH, CANVAS_HEIGHT - LANE_TOP_Y);
      ctx.restore();
    }
  }

  /* function drawMarker
   * マーカーを描画します
   * 戻り値 : なし
   */
  function drawMarker() {
    ctx.drawImageCenter(img.normalMarker, CANVAS_WIDTH / 2, 800, 34, 34);
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

// var WebAudio = (function() {

//   var audioContext = window.AudioContext || window.webkitAudioContext;

//   function WebAudio() {
//     this.src = "";
//     this.ctx = null;
//   }

//   WebAudio.prototype.__defineSetter__("src", function(val) {
//   });

//   WebAudio.prototype.play = function() {

//   };

//   WebAudio.prototype.pause = function() {

//   };

//   WebAudio.prototype.setVolume = function() {

//   };

//   return WebAudio;
// }());

window.addEventListener("DOMContentLoaded", function() {
  var WebAudio = (function() {

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var audioContext = new AudioContext();

    function WebAudio() {
      this._src = "";
      this.loop = false;
      this.readyState = 0;
      this.loadFlag = false;
      this.bufferSrc = null;
      this.buffer = null;
      this.gainNode = audioContext.createGain();
      this.event = {};
    }

    WebAudio.prototype.__defineGetter__("src", function() {
      return this._src;
    });

    WebAudio.prototype.__defineSetter__("src", function(val) {
      if (!val) {
        this._src = val;
      }
      this._src = val;

      var xhr = new XMLHttpRequest();
      var self = this;

      xhr.open("get", this.src, true);
      xhr.responseType = "arraybuffer";

      xhr.addEventListener("readystatechange", function() {
        switch (xhr.readyState) {
          case 4:
            if (xhr.status === 200) {
              audioContext.decodeAudioData(xhr.response, function(buffer) {
                self.buffer = buffer;
                self.loadFlag = true;
                if (typeof self.event.load === "function") {
                  self.event.load();
                }
              });
            } else {

              if (typeof self.event.error === "function") {
                self.event.error();
              }

              throw new Error("読み込みに失敗しました(" + self.src + ")");
            }
            break;
          default:
            self.readyState = xhr.readyState;
            break;
        }
      });

      xhr.send();
    });

    WebAudio.prototype.play = function(when, offset) {

      if (!this.loadFlag) {
        return;
      }

      when = when ? when : 0;
      offset = offset ? offset : 0;
      when = when / 1000.0;
      offset = offset / 1000.0;

      this.bufferSrc = audioContext.createBufferSource();
      this.bufferSrc.buffer = this.buffer;
      this.bufferSrc.connect(this.gainNode);
      this.bufferSrc.loop = this.loop;
      this.gainNode.connect(audioContext.destination);
      if (!this.bufferSrc.loop) {
        this.bufferSrc.start(when, offset);
        //this.bufferSrc.start(when + audioContext.currentTime, offset);
      } else {
        this.bufferSrc.start(when);
        //this.bufferSrc.start(when + audioContext.currentTime);
      }
    };

    WebAudio.prototype.pause = function(when) {

      if (!this.loadFlag) {
        return;
      }

      when = when ? when : 0;

      this.bufferSrc.stop(when + audioContext.currentTime);
    };

    WebAudio.prototype.setVolume = function(volume) {

      if (!this.loadFlag) {
        return;
      }

      volume = volume >= 0 ? volume : 0;
      volume = volume <= 2 ? volume : 2;

      this.gainNode.gain.value = Math.pow(100, volume) / 100;

    };

    WebAudio.prototype.addEventListener = function(event, callback) {
      this.event[event] = callback;
    };

    return WebAudio;
  })();
  b = new WebAudio();
  b.src = "sbrs/CalamityFortuned.ogg";
  b.addEventListener("load", function() {
    alert("load")
  });
  b.addEventListener("error", function() {
    alert("error")

  });

  c = new WebAudio();
  c.src = "se/long.wav";
});