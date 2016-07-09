var SBRPlayer = (function() {

  var SBRSPlayer = {};
  var canvas = null;
  var ctx = null;

  var CANVAS_WIDTH = 2048 / 2; // CANVASの横幅
  var CANVAS_HEIGHT = 2732 / 2; // CANVASの縦幅

  SBRSPlayer.sbrs = null; // sbrスクリプトオブジェクト

  var playData = {};
  SBRSPlayer.playData = playData; // プレイデータ
  
  var load = {};
  load.imgCount = 0;
  load.imgLoadCount = 0;
  load.soundCount = 0;
  load.soundLoadCount = 0;
  load.endFlag = false;
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

      // キャンバスのサイズ設定
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      // パラメータから譜面のパス取得
      sbrsPath = location.search.match(/load=([^&]*)(&|$)/)[1];

      // 譜面読み込み
      SBRSPlayer.sbrs = SBRScript.load(sbrsPath, true, {

        // 読み込み成功
        load: function() {

          // 画面描画
          draw();
        },
        // 読み込み失敗
        error: function() {
          playerElement.innerHTML = "読み込みに失敗しました(load:" + decodeURI(sbrsPath) + ")";
        }
      });

      // リソース読み込み
      loadResource();

    } catch (e) {
      playerElement.innerHTML = "パラメータエラー";
      console.error(e);
    }
  });

  function loadResource() {
  /* function draw
   * 解析した譜面データを元に、画面の描画を行います
   * 戻り値 : なし
   */
  }

  /* function draw
   * 解析した譜面データを元に、画面の描画を行います
   * 戻り値 : なし
   */
  function draw(time) {

    time = time ? time : getTime();
    
    if(load.endFlag) {
      // 全リソースの読み込み完了
    } else {
      // リソース読込中

      drawLoad();
    }

    requestAnimationFrame(draw);

  }

  /* function drawLoad
   * 読み込み中画面の描画を行います
   * 戻り値 : なし
   */
  function drawLoad() {

  }

  return SBRSPlayer;
}());