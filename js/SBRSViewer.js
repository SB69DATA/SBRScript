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
    viewer.option.laneWidth = 23;
    viewer.option.colBeat = 32;
    viewer.option.markerSize = 13;
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
    var markerIndex;
    var colDrawBeat;
    var laneCount;
    var i, iLen;

    viewElement = document.getElementById("view");
    laneCount = sbrs.laneCount;

    // viewを初期化
    viewElement.innerHTML = "";
    initViewer();
    updateInfo();

    // 列データ格納用テーブル作成
    colTable = document.createElement("table");
    colTr = document.createElement("tr");
    colTable.appendChild(colTr);

    // 描画済みマーカーのindexを初期化
    markerIndex = 0;

    // 全小節の描画が終わるまでループ
    for (measureIndex = 0, measureIndexLength = sbrs.measureCount; measureIndex < measureIndexLength;) {

      // 列データ作成
      colTd = document.createElement("td");
      colTr.appendChild(colTd);

      // 小節データ格納用テーブル作成
      // テーブルのサイズは 各レーンの幅 * レーン数 + ヘッダの幅 + ボーダー
      measureTable = document.createElement("table");
      colTd.appendChild(measureTable);
      measureTable.className = "col";
      measureTable.style.width = (viewer.option.laneWidth * laneCount + 20 + 3 + (laneCount - 1)) + "px";

      // 1列の描画済み拍数を初期化
      colDrawBeat = 0;

      // 1列に1小節は必ず表示する
      do {

        // 全小節の描画が終わった後は、最終小節の拍子で空の小節データを作成
        if (measureIndex < measureIndexLength) {
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
        measureTh.innerHTML = (measureIndex + 1);

        // 小節のデータ作成
        measureTd = document.createElement("td");
        measureTr.appendChild(measureTd);
        measureTd.style.height = (measureBeat * viewer.option.beatHeight - 1) + "px";

        // 拍子線、小節線の描画
        drawLine(measureTd, measureS, measureB, laneCount, (measureBeat * viewer.option.beatHeight - 1));

        // 前の小節から続くロングマーカーの描画

        // マーカーの描画
        markerIndex = drawMarker(measureTd, markerIndex, measureIndex + 1, (measureBeat * viewer.option.beatHeight - 1));

        measureIndex++;

      } while ((colDrawBeat += measureBeat) < viewer.option.colBeat);

    }

    // viewに反映
    viewElement.appendChild(colTable);

    // 情報エリアを更新
    updateInfo();

    return viewer;

    /* function drawMarker
     * マーカーを含むdiv要素を小節データに追加します
     * 引数1 : 小節データ要素
     * 引数2 : 描画済みマーカーのindex
     * 引数3 : 現在の小節
     * 引数4 : 描画エリアの高さ
     * 戻り値 : なし
     */
    function drawMarker(measureTd, markerIndex, measure, divHeight) {

      var len;
      var marker;
      var markerDiv;

      var div;
      div = document.createElement("div");
      div.className = "marker-aria";
      div.style.height = divHeight + "px";

      for (len = sbrs.marker.length; markerIndex < len && sbrs.marker[markerIndex].measure === measure; markerIndex++) {
        marker = sbrs.marker[markerIndex];

        markerDiv = document.createElement("div");
        markerDiv.style.height = (viewer.option.markerSize - 2) + "px";
        markerDiv.style.width = (viewer.option.markerSize - 2) + "px";
        markerDiv.style.borderRadius = (viewer.option.markerSize / 2) + "px";
        markerDiv.style.left = ((marker.lane - 1) * (viewer.option.laneWidth + 1) + ((viewer.option.laneWidth - viewer.option.markerSize) / 2)) + "px";
        markerDiv.style.bottom = (marker.point * viewer.option.beatHeight - (viewer.option.markerSize - 1) / 2 - 1) + "px";

        switch (marker.type) {
          case 1:
            // 通常マーカー
            markerDiv.className = "normal-marker";
            break;
          case 2:
            // ロング開始
            markerDiv.className = "long-marker";
            break;
          case 3:
            // ロング終了
            markerDiv.className = "long-marker";
            break;
        }

        div.appendChild(markerDiv);
      }
      measureTd.appendChild(div);

      return markerIndex;
    }

    /* function drawLine
     * 拍子線、レーンの区切り線を含むdiv要素を小節データに追加します
     * 引数1 : 小節データ要素
     * 引数2 : 拍子の分子
     * 引数3 : 拍子の分母
     * 引数4 : レーン数
     * 引数5 : 描画エリアの高さ
     * 戻り値 : なし
     */
    function drawLine(measureTd, measureS, measureB, laneCount, divHeight) {

      var div;
      var divTmp;
      var beatHeight;
      var i, iLen;

      div = document.createElement("div");
      div.className = "line-aria";
      div.style.height = divHeight + "px";
      beatHeight = viewer.option.beatHeight * measureS / measureB;

      // レーンの線
      for (i = 1, iLen = laneCount; i < iLen; i++) {
        divTmp = document.createElement("div");
        divTmp.className = "lane-line";
        divTmp.style.left = ((viewer.option.laneWidth + 1) * i + -1) + "px";
        div.appendChild(divTmp);
      }

      // 拍子の線
      for (i = 1, iLen = measureS; i < iLen; i++) {
        divTmp = document.createElement("div");
        divTmp.className = "beat-line";
        divTmp.style.bottom = (beatHeight * i - 1) + "px";
        div.appendChild(divTmp);
      }

      measureTd.appendChild(div);
    }
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