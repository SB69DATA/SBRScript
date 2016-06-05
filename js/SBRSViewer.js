window.addEventListener("DOMContentLoaded", function() {

  try {

    // パラメータから譜面のパス取得
    var sbrsPath = location.search.match(/load=([^&]*)(&|$)/)[1];

    // 譜面読み込み
    var sbrs = SBRS.load(sbrsPath, true, {

      // 読み込み成功
      success: function() {

        // 譜面描画
        var viewer = SBRSViewer.draw(sbrs);
      },

      // 読み込み失敗
      error: function() {

      }
    });

  } catch (e) {
    document.getElementById("view").innerHTML = "描画に失敗しました";
  }
});

var SBRSViewer = (function() {

  var SBRSViewer = {};
  var viewer = null;

  function initViewer(sbrs) {
    viewer = {};
    viewer.sbrs = sbrs;
    viewer.info = {};
    viewer.info.combo = "-";
    viewer.info.marker = "-";
    viewer.info.fevercombo = "-";
    viewer.info.fevergauge = "-";
    viewer.info.bossattack = "-";
    viewer.info.playercoombo = "-";
    viewer.info.bosscombo = "-";
    viewer.info.time = "-";
  }


  /* function draw
   * 解析した譜面データを元に、譜面を描画します
   * 引数1 : SBRS.parseで解析した譜面データ
   * 戻り値 : 描画した譜面のデータを格納したオブジェクト
   */
  SBRSViewer.draw = function(sbrs) {
    
    console.log(sbrs);

    initViewer(sbrs);

    return viewer;
  };

  function updateInfo(sbrs) {

  }

  return SBRSViewer;

}());

function updateInfo(sbrs, type) {
  document.querySelector("#info-combo .value").innerHTML = sbrs.comboCount;
}