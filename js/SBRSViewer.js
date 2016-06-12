/*
 * 履歴
 */
var SBRSViewer = (function() {

  var SBRSViewer = {};
  var viewer = {};

  var PLAYER_ATTACK_TIME = 10000;
  var PLAYER_LONG_ATTACK_TIME = 22000;
  var BOSS_ATTACK_TIME = 8500;
  var BOSS_SHORT_ATTACK_TIME = 7000;
  var FEVER_TIME = 10000;
  var DEFAULT_START_OFFSET = -2500;

  function initViewer(sbrs) {
    viewer.sbrs = sbrs;
    viewer.title = "No Title ★0";
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
  }

  function initOption() {
    viewer.option = {};
    viewer.option.beatHeight = 20;
    viewer.option.laneWidth = 13;
    viewer.option.colBeat = 32;
    viewer.option.markerSize = 13;
    viewer.option.startOffset = DEFAULT_START_OFFSET;
    viewer.option.feverGaugeHigh = false;
    viewer.option.bossAttackFrequently = false;
    viewer.option.bossAttackShort = false;
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

          // フォームを無効化
          disableForm();
        }
      });

      // オプションを初期化
      initOption();

      // イベント登録
      addEvent();

      // フォームの選択状態をリセット
      resetForm();

    } catch (e) {
      document.getElementById("view").innerHTML = "パラメータエラー";
      console.error(e);
    }

    /* function addEvent
     * イベントを登録します
     * 戻り値 : なし
     */
    function addEvent() {

      var stageTypeElements;
      var i, iLen;

      // ステージタイプの変更イベントを登録
      stageTypeElements = document.getElementsByName("stage-type");
      for (i = 0, iLen = stageTypeElements.length; i < iLen; i++) {
        stageTypeElements[i].addEventListener("change", changeStageType);
      }

      // フィーバーゲージがたまりやすくなるのスキル切り替えイベントを登録
      document.getElementById("option-skill-fever").addEventListener("change", function(e) {
        viewer.option.feverGaugeHigh = e.target.checked;
        SBRSViewer.draw(sbrs);
      });

      // ボスの攻撃頻度を下げるのスキル切り替えイベントを登録
      document.getElementById("option-skill-bossattackfrequently").addEventListener("change", function(e) {
        viewer.option.bossAttackFrequently = e.target.checked;
        SBRSViewer.draw(sbrs);
        changeStageType();
      });

      // ボスの攻撃時間が短くなるのスキル切り替えイベントを登録
      document.getElementById("option-skill-bossattackshort").addEventListener("change", function(e) {
        viewer.option.bossAttackShort = e.target.checked;
        SBRSViewer.draw(sbrs);
        changeStageType();
      });
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
      document.getElementById("option-skill-bossattackshort").checked = false;
    }

    /* function disableForm
     * フォームを無効化します
     * 戻し値 : なし
     */
    function disableForm() {

      var elements;
      var i, iLen;

      elements = document.getElementsByTagName("input");

      for (i = 0, iLen = elements.length; i < iLen; i++) {
        elements[i].disabled = "disabled";
      }
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
    var measure, measureIndex, measureIndexLength;
    var measureBeat, measureS, measureB, measureHeight;
    var markerAriaDiv, lineAriaDiv;
    var markerIndex;
    var colDrawBeat;
    var laneCount;
    var markerHitInfo = [];
    var longMakrerInfo = [];
    var backgroundInfo = [];
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

    // マーカーの判定などを格納する配列の初期化
    initMarkerHitInfo(markerHitInfo);

    // フィーバーゲージ、ボス攻撃時間の情報をセット
    setBackgroundInfo(backgroundInfo, markerHitInfo);

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

        // 現在の小節
        measure = measureIndex + 1;

        // 全小節の描画が終わった後は、最終小節の拍子で空の小節データを作成
        if (measureIndex < measureIndexLength) {
          // 拍子の分子と分母、拍数を取得
          measureS = sbrs.measure[measureIndex].valueS;
          measureB = sbrs.measure[measureIndex].valueB;
          measureBeat = measureS / measureB * 4.0;
        }

        // 1小節分の行作成
        measureTr = measureTable.insertRow(0);
        measureTr.id = "measure-" + measure;

        // 小節のヘッダ作成
        measureTh = document.createElement("th");
        measureTr.appendChild(measureTh);
        measureTh.innerHTML = measure;

        // 小節のデータ作成
        measureHeight = measureBeat * viewer.option.beatHeight - 1;
        measureTd = document.createElement("td");
        measureTr.appendChild(measureTd);
        measureTd.style.height = measureHeight + "px";

        // レーンの区切り線、拍子線の描画エリア作成
        lineAriaDiv = document.createElement("div");
        lineAriaDiv.className = "line-aria";
        lineAriaDiv.style.height = measureHeight + "px";
        measureTd.appendChild(lineAriaDiv);

        // マーカーの描画エリア作成
        markerAriaDiv = document.createElement("div");
        markerAriaDiv.className = "marker-aria";
        markerAriaDiv.style.height = measureHeight + "px";
        measureTd.appendChild(markerAriaDiv);

        // フィーバ中、ボス攻撃中用のバックグラウンドを描画
        drawBackground(lineAriaDiv, measure, measureS, measureB, backgroundInfo, measureHeight);

        // レーンの区切り線、拍子線の描画
        drawLine(lineAriaDiv, measureS, measureB, laneCount);

        // ロングマーカーの中間線を描画
        drawLongLine(markerAriaDiv, measure, measureHeight, longMakrerInfo, colDrawBeat);

        // マーカーの描画
        markerIndex = drawMarker(markerAriaDiv, markerIndex, measure, measureHeight, longMakrerInfo);

        measureIndex++;

      } while ((colDrawBeat += measureBeat) < viewer.option.colBeat);

    }

    // viewに反映
    viewElement.appendChild(colTable);

    // 情報エリアに必要な情報をsbrsから取得、設定
    setIntoFromSbrs();

    // 情報エリアを更新
    updateInfo();

    return viewer;

    /* function initMarkerHitInfo
     * マーカーの判定などを格納する配列を初期化します
     * 引数1 : マーカーの判定などを格納する配列
     * 戻り値 : なし
     */
    function initMarkerHitInfo(markerHitInfo) {

      var markerObj;
      var longMarkerObj;
      var i, iLen, j, jLen;
      var measure;

      for (i = 0, iLen = sbrs.markerCount; i < iLen; i++) {

        markerObj = sbrs.marker[i];
        measure = markerObj.measure;

        markerHitInfo.push({
          type: markerObj.type,
          time: markerObj.time,
          measure: measure,
          point: markerObj.point,
          judge: 0
        });

        if (markerObj.long) {
          for (j = 0, jLen = markerObj.long.length; j < jLen; j++) {

            longMarkerObj = sbrs.marker[i].long[j];
            measure = longMarkerObj.measure;

            markerHitInfo.push({
              type: longMarkerObj.type,
              time: longMarkerObj.time,
              measure: measure,
              point: longMarkerObj.point,
              judge: 0
            });
          }
        }
      }

      // 時間順でソート
      markerHitInfo.sort(function(a, b) {
        return a.time - b.time;
      });
      console.log(markerHitInfo);
    }

    /* function setBackgroundInfo
     * フィーバーゲージ、ボス攻撃時間の情報をセットします
     * 引数1 : フィーバーゲージ、ボス攻撃時間の情報を格納する配列
     * 引数2 : マーカーの判定などを格納する配列
     * 戻り値 : なし
     */
    function setBackgroundInfo(backgroundInfo, markerHitInfo) {

      var feverGauge;
      var measureIndex, measureIndexLength;
      var normalComboCount, feverComboCount;
      var hitInfo;
      var feverEndTime;
      var hitTime;
      var hitPoint;
      var addGaugeIncrement;
      var playerAttackTime, bossAttackTime;
      var bossAttackCount;
      var playerComboCount, bossComboCount;
      var fromTime, toTime;
      var fromData, toData;
      var time;
      var markerIndex;
      var i, iLen;
      var markerHitIndex, markerHitLength;

      feverEndTime = 0;
      feverGauge = 0;
      normalComboCount = 0;
      feverComboCount = 0;
      addGaugeIncrement = 4 * (viewer.option.feverGaugeHigh ? 7 : 1);

      markerHitIndex = 0;
      markerHitLength = markerHitInfo.length;

      // フィーバーゲージの範囲セット
      for (measureIndex = 0, measureIndexLength = sbrs.measureCount; measureIndex < measureIndexLength; measureIndex++) {

        while (markerHitIndex < markerHitLength && markerHitInfo[markerHitIndex].measure === measureIndex + 1) {

          hitInfo = markerHitInfo[markerHitIndex];
          hitTime = hitInfo.time;
          hitPoint = hitInfo.point;

          if (hitTime < feverEndTime) {
            // フィーバー中

            feverComboCount++;

          } else {
            // 非フィーバー

            normalComboCount++;
            feverGauge += addGaugeIncrement;
          }
          // フィーバー開始
          if (feverGauge >= sbrs.feverGaugeLength) {

            feverEndTime = hitTime + FEVER_TIME;
            feverGauge = 0;

            toData = SBRS.getMeasurePointFromTime(feverEndTime);
            backgroundInfo.push({
              from: {
                measure: measureIndex + 1,
                point: hitPoint,
                time: hitTime
              },
              to: {
                measure: toData.measure,
                point: toData.point,
                time: feverEndTime
              },
              type: 1
            });
          }
          markerHitIndex++;
        }
      }


      markerHitIndex = 0;
      bossAttackCount = 0;
      playerComboCount = 0;
      bossComboCount = 0;
      time = viewer.option.startOffset;
      playerAttackTime = viewer.option.bossAttackFrequently ? PLAYER_LONG_ATTACK_TIME : PLAYER_ATTACK_TIME;
      bossAttackTime = viewer.option.bossAttackShort ? BOSS_SHORT_ATTACK_TIME : BOSS_ATTACK_TIME;

      // ボス攻撃の範囲セット
      while (time + playerAttackTime < sbrs.endTime) {

        fromTime = (time += playerAttackTime);
        toTime = (time += bossAttackTime);
        fromData = SBRS.getMeasurePointFromTime(fromTime);
        toData = SBRS.getMeasurePointFromTime(toTime);

        backgroundInfo.push({
          from: {
            measure: fromData.measure,
            point: fromData.point,
            time: fromTime
          },
          to: {
            measure: toData.measure,
            point: toData.point,
            time: toTime
          },
          type: 2
        });

        // 通常マーカーのカウント
        while (markerHitIndex < markerHitLength && markerHitInfo[markerHitIndex].time < fromTime) {
          playerComboCount++;
          markerHitIndex++;
        }

        // BOSSアタックマーカーのカウント
        while (markerHitIndex < markerHitLength && markerHitInfo[markerHitIndex].time < toTime) {
          bossComboCount++;
          markerHitIndex++;
        }

        bossAttackCount++;
      }
      // 通常マーカーのカウント
      while (markerHitIndex < markerHitLength) {
        playerComboCount++;
        markerHitIndex++;
      }

      console.log(backgroundInfo);

      // 描画開始時間順にソート
      backgroundInfo.sort(function(a, b) {
        return a.from.time - b.from.time;
      });

      viewer.info.fevercombo = feverComboCount;
      viewer.info.bossattack = bossAttackCount;
      viewer.info.playercombo = playerComboCount;
      viewer.info.bosscombo = bossComboCount;
    }

    /* function drawBackground
     * ラインエリアのdiv要素にフィーバー中、ボス攻撃中のバックグラウンドを追加します
     * 引数1 : ラインdiv要素
     * 引数2 : 現在の小節
     * 引数3 : フィーバーゲージ、ボス攻撃時間の情報を格納する配列
     * 引数4 : 描画エリアの高さ
     * 戻り値 : なし
     */
    function drawBackground(lineAriaDiv, measure, measureS, measureB, backgroundInfo, measureHeight) {

      var i, iLen;
      var bgInfo;
      var bgDiv;
      var bottom;

      for (i = 0, iLen = backgroundInfo.length; i < iLen; i++) {

        bgInfo = backgroundInfo[i];

        if (measure < bgInfo.from.measure) {
          continue;
        }

        bgDiv = document.createElement("div");

        if (bgInfo.type === 1) {
          // フィーバー
          bgDiv.className = "fever-background type-score";
        } else if (bgInfo.type === 2) {
          // ボス攻撃
          bgDiv.className = "boss-background type-boss";
        }

        if (measure === bgInfo.from.measure && measure === bgInfo.to.measure) {
          // 開始小節と終了小節が同じ

        } else if (measure === bgInfo.from.measure) {
          // 開始小節
          bottom = (bgInfo.from.point * viewer.option.beatHeight * 4 / measureB);
          bgDiv.style.height = (measureHeight - bottom) + "px";
          bgDiv.style.bottom = bottom + "px";
        } else if (measure === bgInfo.to.measure) {
          // 終了小節
          bottom = 0;
          bgDiv.style.height = (bgInfo.to.point * measureS / measureB) * viewer.option.beatHeight + "px";
          bgDiv.style.bottom = bottom + "px";
        } else if (measure > bgInfo.from.measure && measure < bgInfo.to.measure) {
          // 中間
          bottom = 0;
          bgDiv.style.height = (measureHeight - bottom) + "px";
          bgDiv.style.bottom = bottom + "px";
        }

        lineAriaDiv.appendChild(bgDiv);
      }


    }

    /* function drawMarker
     * マーカーエリアのdiv要素にマーカーを追加します
     * 引数1 : マーカーdiv要素
     * 引数2 : 描画済みマーカーのindex
     * 引数3 : 現在の小節
     * 引数4 : 描画エリアの高さ
     * 引数5 : ロングマーカーの描画情報
     * 戻り値 : 次に処理するマーカーのインデックス
     */
    function drawMarker(markerAriaDiv, markerIndex, measure, measureHeight, longMakrerInfo) {

      var len;
      var marker;
      var markerDiv;
      var measureObj;
      var measureB;

      if (measure <= sbrs.measureCount) {

        measureObj = sbrs.measure[measure - 1];
        measureB = measureObj.valueB;

        for (len = sbrs.markerCount; markerIndex < len && sbrs.marker[markerIndex].measure === measure; markerIndex++) {
          marker = sbrs.marker[markerIndex];

          markerDiv = document.createElement("div");
          markerDiv.style.height = (viewer.option.markerSize - 2) + "px";
          markerDiv.style.width = (viewer.option.markerSize - 2) + "px";
          markerDiv.style.borderRadius = (viewer.option.markerSize / 2) + "px";
          markerDiv.style.left = ((marker.lane - 1) * (viewer.option.laneWidth + 1) + ((viewer.option.laneWidth - viewer.option.markerSize) / 2)) + "px";
          markerDiv.style.bottom = (marker.point * viewer.option.beatHeight * 4 / measureB - (viewer.option.markerSize - 1) / 2 - 1) + "px";
          markerDiv.style.lineHeight = (viewer.option.markerSize - 2) + "px";

          switch (marker.type) {
            case 1:
              // 通常マーカー
              markerDiv.className = "normal-marker";
              markerDiv.style.zIndex = 200 + len - markerIndex;
              break;
            case 2:
              // ロング開始
              markerDiv.className = "long-marker";
              markerDiv.style.zIndex = 300 + len - markerIndex;
              markerDiv.innerHTML = 2 + marker.long.length;
              longMakrerInfo[marker.lane - 1] = {
                start: {
                  measure: marker.measure,
                  point: marker.point
                },
                end: {
                  measure: sbrs.marker[marker.pair].measure,
                  point: sbrs.marker[marker.pair].point
                },
                style: {
                  width: markerDiv.style.width,
                  left: markerDiv.style.left
                }
              };

              // ロングマーカーの中間線を描画
              drawLongLine(markerAriaDiv, measure, measureHeight, longMakrerInfo);
              break;
            case 3:
              // ロング終了
              markerDiv.className = "long-marker";
              markerDiv.style.zIndex = 100 + len - markerIndex;
              break;
            default:
          }

          markerAriaDiv.appendChild(markerDiv);
        }
      }

      return markerIndex;
    }

    /* function drawLongLine
     * マーカーエリアのdiv要素にロングマーカーの中間線を追加します
     * 引数1 : マーカーdiv要素
     * 引数2 : 現在の小節
     * 引数3 : 描画エリアの高さ
     * 引数4 : ロングマーカーの描画情報
     * 引数5 : 1列の描画済み拍数
     * 戻り値 : なし
     */
    function drawLongLine(markerAriaDiv, measure, measureHeight, longMarkerInfo, colDrawBeat) {

      var laneCount = sbrs.laneCount;
      var fromY, toY;
      var markerDiv;
      var i, iLen;
      var measureObj;
      var measureB;

      if (measure <= sbrs.measureCount) {

        measureObj = sbrs.measure[measure - 1];
        measureB = measureObj.valueB;

        for (i = 0, iLen = laneCount; i < iLen; i++) {

          if (longMarkerInfo[i] && measure === longMarkerInfo[i].start.measure) {

            if (measure === 85) {
              var j = 0;
            }

            fromY = longMarkerInfo[i].start.point * 4 / measureB * viewer.option.beatHeight;
            if (measure < longMarkerInfo[i].end.measure) {
              toY = measureHeight;
            } else {
              toY = longMarkerInfo[i].end.point * 4 / measureB * viewer.option.beatHeight;
            }

            markerDiv = document.createElement("div");
            markerDiv.className = "long-line";
            markerDiv.style.height = Math.ceil(toY - fromY + 1) + "px";
            markerDiv.style.width = longMarkerInfo[i].style.width;
            markerDiv.style.left = longMarkerInfo[i].style.left;

            if (colDrawBeat === 0) {
              // 列の1小節目はbottomの位置を1px高めに
              markerDiv.style.bottom = Math.floor(fromY - 0) + "px";
            } else {
              markerDiv.style.bottom = Math.floor(fromY - 1) + "px";
            }

            markerAriaDiv.appendChild(markerDiv);

            if (measure === longMarkerInfo[i].end.measure + 1 && longMarkerInfo[i].end.point === 0) {
              longMarkerInfo[i] = null;
            } else if (measure < longMarkerInfo[i].end.measure) {
              longMarkerInfo[i].start.measure = measure + 1;
              longMarkerInfo[i].start.point = 0;
            } else {
              longMarkerInfo[i] = null;
            }
          }
        }
      }
    }

    /* function drawLine
     * ラインエリアのdiv要素に拍子線、レーンの区切り線を追加します
     * 引数1 : ラインdiv要素
     * 引数2 : 拍子の分子
     * 引数3 : 拍子の分母
     * 引数4 : レーン数
     * 引数5 : 描画エリアの高さ
     * 戻り値 : なし
     */
    function drawLine(lineAriaDiv, measureS, measureB, laneCount, divHeight) {

      var divTmp;
      var beatHeight;
      var i, iLen;

      beatHeight = viewer.option.beatHeight * 4 / measureB;

      // 拍子の線
      for (i = 1, iLen = measureS; i < iLen; i++) {
        divTmp = document.createElement("div");
        divTmp.className = "beat-line";
        divTmp.style.bottom = (beatHeight * i - 1) + "px";
        lineAriaDiv.appendChild(divTmp);
      }

      // 拍子の線2
      for (i = 0, iLen = measureS; i < iLen; i++) {
        divTmp = document.createElement("div");
        divTmp.className = "beat-subline";
        divTmp.style.bottom = (beatHeight * (i+0.5) - 1) + "px";
        lineAriaDiv.appendChild(divTmp);
      }

      // レーンの線
      for (i = 1, iLen = laneCount; i < iLen; i++) {
        divTmp = document.createElement("div");
        divTmp.className = "lane-line";
        divTmp.style.left = ((viewer.option.laneWidth + 1) * i + -1) + "px";
        lineAriaDiv.appendChild(divTmp);
      }
    }

    /* function setInfoFromSbrs
     * 情報エリアに必要な情報をsbrsから取得、設定します
     * 引数1 : sbrsオブジェクト
     * 戻り値 : なし
     */
    function setIntoFromSbrs() {

      // タイトル設定
      viewer.title = sbrs.title + " ★" + sbrs.level;

      // BPM設定
      if (sbrs.bpmCount === 1) {
        viewer.info.bpm = sbrs.maxBpm;
      } else {
        viewer.info.bpm = sbrs.minBpm + " - " + sbrs.maxBpm;
      }

      // コンボ数設定
      viewer.info.combo = sbrs.comboCount;

      // マーカー数設定
      viewer.info.marker = sbrs.normalMarkerCount + sbrs.longMarkerCount;

      // ゲージの長さ設定
      viewer.info.fevergauge = sbrs.feverGaugeLength;

      // 演奏時間設定
      viewer.info.time = Math.round(sbrs.endTime / 1000);
    }
  };

  /* function updateInfo
   * viewerのデータを元に情報エリアを更新します
   * 戻り値 : なし
   */
  function updateInfo() {

    document.title = viewer.title + " | Sb69 Score Viewer";
    document.querySelector("#title .value").innerHTML = viewer.title;
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