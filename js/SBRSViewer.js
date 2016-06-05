/*
 * 履歴
 */
var SBRSViewer = (function() {

  var SBRSViewer = {};
  var viewer = null;

  function initViewer(sbrs) {
    viewer = {};
    viewer.sbrs = sbrs;
    viewer.info = {};
    viewer.info.bpm = "-";
    viewer.info.combo = "-";
    viewer.info.marker = "-";
    viewer.info.fevercombo = "-";
    viewer.info.fevergauge = "-";
    viewer.info.bossattack = "-";
    viewer.info.playercombo = "-";
    viewer.info.bosscombo = "-";
    viewer.info.time = "-";
    viewer.option = {};
    viewer.option.beatHeight = 20;
    viewer.option.laneWidth = 20;
    viewer.option.colBeat = 24;
    viewer.option.markerScale = 1.0;
  }

  window.addEventListener("DOMContentLoaded", function() {

    try {

      // パラメータから譜面のパス取得
      var sbrsPath = location.search.match(/load=([^&]*)(&|$)/)[1];

      // 譜面読み込み
      var sbrs = SBRS.load(sbrsPath, true, {

        // 読み込み成功
        success: function() {

          try {
            // 譜面描画
            var viewer = SBRSViewer.draw(sbrs);

          } catch (e) {
            document.getElementById("view").innerHTML = "譜面の描画に失敗しました";
            console.error(e);
          }

        },

        // 読み込み失敗
        error: function() {
          document.getElementById("view").innerHTML = "読み込みに失敗しました(path:" + sbrsPath + ")";
        }
      });

      // ステージタイプの変更イベント登録
      addStageTypeChangeEvent();

      // フォームの選択状態をリセット
      resetForm();

    } catch (e) {
      document.getElementById("view").innerHTML = "パラメータエラー";
      console.error(e);
    }

    /* function addStageTypeChangeEvent
     * ステージタイプの変更イベントを登録します
     * 戻り値 : なし
     */
    function addStageTypeChangeEvent() {

      var stageTypeElements;
      var i, iLen;

      stageTypeElements = document.getElementsByName("stage-type");
      for (i = 0, iLen = stageTypeElements.length; i < iLen; i++) {
        stageTypeElements[i].addEventListener("change", changeStageType);
      }
    }

    /* function resetForm
     * フォームの選択状態をリセットします(更新してもフォームの選択がリセットされないブラウザ用)
     * 戻り値 : なし
     */
    function resetForm() {

      // ステージの種類をリセット
      document.getElementById("stage-type-score").checked = true;

      // スキルの使用有無をリセット
      document.getElementById("option-skill-fever").checked = false;
      document.getElementById("option-skill-bossattackfrequently").checked = false;
      document.getElementById("option-skill-bossattacktime").checked = false;
    }

    /* function changeStageType
     * ステージの種類に応じて、画面に表示する項目を変更します
     * 戻り値 : なし
     */
    function changeStageType() {

      var stageType;
      var typeScoreElements, typeBossElements;
      var typeScoreStyle, typeBossStyle;
      var i, iLen;

      // 選択されているステージタイプを取得("score" : スコアアタック, "boss" : BOSSバトル)
      stageType = document.getElementById("stage-type-score").checked ? "score" : "boss";

      // displayプロパティに適用する値を指定
      switch (stageType) {
        case "score":
          typeScoreStyle = "block";
          typeBossStyle = "none";
          break;
        case "boss":
          typeScoreStyle = "none";
          typeBossStyle = "block";
          break;
      }

      // スコアアタック選択時にのみ表示する要素のdisplayプロパティに値を設定
      typeScoreElements = document.getElementsByClassName("type-score");
      for (i = 0, iLen = typeScoreElements.length; i < iLen; i++) {
        typeScoreElements[i].style.display = typeScoreStyle;
      }

      // BOSSバトル選択時にのみ表示する要素のdisplayプロパティに値を設定
      typeBossElements = document.getElementsByClassName("type-boss");
      for (i = 0, iLen = typeBossElements.length; i < iLen; i++) {
        typeBossElements[i].style.display = typeBossStyle;
      }
    }
  });

  /* function draw
   * 解析した譜面データを元に、譜面を描画します
   * 引数1 : SBRS.parseで解析した譜面データ
   * 戻り値 : 描画した譜面のデータを格納したオブジェクト
   */
  SBRSViewer.draw = function(sbrs) {

    // デバッグ用
    console.log(sbrs);

    var viewElement;
    var colTable, colTr, colTd;
    var measureTable, measureTr, measureTh, measureTd;
    var measureIndex, measureIndexLength;
    var measureBeat, measureS, measureB;
    var colDrawBeat;
    var i, iLen;

    viewElement = document.getElementById("view");

    // viewを初期化
    viewElement.innerHTML = "";
    initViewer();
    updateInfo();

    // 列データ格納用テーブル作成
    colTable = document.createElement("table");
    colTr = document.createElement("tr");
    colTable.appendChild(colTr);

    // 全小節の描画が終わるまでループ
    for (measureIndex = 0, measureIndexLength = sbrs.measureCount; measureIndex < measureIndexLength;) {

      // 列データ作成
      colTd = document.createElement("td");
      colTr.appendChild(colTd);

      // 小節データ格納用テーブル作成
      measureTable = document.createElement("table");
      colTd.appendChild(measureTable);
      
      // 1列の描画済み拍数を初期化
      colDrawBeat = 0;

      do {

        // 全小節の描画が終わった後は、最終小節の拍子で空の小節データを作成
        if(measureIndex < measureIndexLength) {
          // 拍子の分子と分母、拍数を取得
          measureS = sbrs.measure[measureIndex].valueS;
          measureB = sbrs.measure[measureIndex].valueB;
          measureBeat = measureS / measureB * 4.0;
        }

        // 1小節分の行作成
        measureTr = measureTable.insertRow(0);
        measureTr.id = "measure-" + (measureIndex + 1);

        // 小節のヘッダ作成
        measureTh = document.createElement("th");
        measureTr.appendChild(measureTh);

        // 小節のデータ作成
        measureTd = document.createElement("td");
        measureTr.appendChild(measureTd);
        
        measureIndex++;
        
      } while((colDrawBeat += measureBeat) < viewer.option.colBeat);
      
    }

    // viewに反映
    viewElement.appendChild(colTable);

    // 情報エリアを更新
    updateInfo();

    return viewer;
  };

  /* function updateInfo
   * viewerのデータを元に情報エリアを更新します
   * 戻り値 : なし
   */
  function updateInfo() {

    document.querySelector("#info-bpm .value").innerHTML = viewer.info.bpm;
    document.querySelector("#info-combo .value").innerHTML = viewer.info.combo;
    document.querySelector("#info-marker .value").innerHTML = viewer.info.marker;
    document.querySelector("#info-fevercombo .value").innerHTML = viewer.info.fevercombo;
    document.querySelector("#info-fevergauge .value").innerHTML = viewer.info.fevergauge;
    document.querySelector("#info-bossattack .value").innerHTML = viewer.info.bossattack;
    document.querySelector("#info-playercombo .value").innerHTML = viewer.info.playercombo;
    document.querySelector("#info-bosscombo .value").innerHTML = viewer.info.bosscombo;
    document.querySelector("#info-time .value").innerHTML = viewer.info.time;
  }

  return SBRSViewer;

}());