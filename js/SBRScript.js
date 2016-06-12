/*
 * 履歴
 * 2016/04/01 ver 1.00 新規作成
 */
var SBRS = (function() {

  var SBRS = {};
  var sbrs = null;

  function initSbrs() {
    sbrs = {};
    sbrs.url = ""; // sbrsファイルのURL
    sbrs.title = "No Title"; // 曲名
    sbrs.artist = ""; // アーティスト
    sbrs.sound = ""; // 音声ファイル名
    sbrs.soundUrl = ""; // 音声ファイルのURL
    sbrs.soundVolume = 1.0; // 音声ファイルの音量(0.0～1.0)
    sbrs.offset = 0.0; // 再生開始タイミング(ms)
    sbrs.level = 0; // 難易度
    sbrs.bpm = []; // BPMの情報(Bpmオブジェクト)を配列で格納
    sbrs.marker = []; // マーカーの情報(Markerオブジェクト)を配列で格納
    sbrs.measure = []; // 小節の情報(Measureオブジェクト)を配列で格納
    sbrs.bpmCount = 0; // BPMオブジェクト数
    sbrs.measureCount = 0; // 小節オブジェクト数
    sbrs.markerCount = 0; // マーカーオブジェクト数(ロングマーカーのホールド除く)
    sbrs.normalMarkerCount = 0; // 通常マーカーオブジェクトの数
    sbrs.longMarkerCount = 0; // ロングマーカーオブジェクトの数
    sbrs.maxBpm = 0; // BPMの最大値
    sbrs.minBpm = 0; // BPMの最小値
    sbrs.comboCount = 0; // コンボ数の理論値
    sbrs.judgeRange = 1.0; // 判定の範囲
    sbrs.feverGaugeLength = 0; // フィーバーゲージの長さ
    sbrs.fever = 0; // Feverに必要なマーカー数
    sbrs.feverHigh = 0; //  Feverに必要なマーカー数(フィーバーゲージがたまりやすくなる使用時)
    sbrs.readyState = 0; // sbrsの読み込み状態
    sbrs.progress = 0; // 譜面の読み込み進捗状態
    sbrs.laneCount = 0; // レーン数
    sbrs.stage = []; // ステージの情報(Stageオブジェクト)を配列で格納
    sbrs.endTime = 0.0; // 譜面の終了時間
  }

  // Markerオブジェクト
  function Marker() {
    this.measure = 0; // 小節(1～)
    this.point = 0.0; // 拍
    this.time = 0.0; // 時間(ms)
    this.type = 0; // マーカーの種類(1:通常 2:ロング開始 3:ロング終了 4:ロングホールド)
    this.lane = 0; // レーン(1～)
    this.long = null; // ロングマーカーのホールド判定をMarkerの配列で格納
    this.bpm = 0.0; // BPM
    this.scroll = 0.0; // SCROLL
    this.pair = 0; // type2,3の場合、対になるMarkerのindexを格納
  }

  // Measureオブジェクト
  function Measure() {
    this.measure = 0; // 小節(1～)
    this.valueS = 0.0; // 拍子の分子
    this.valueB = 0.0; // 拍子の分母
    this.scroll = 0.0; // SCROLL
    this.time = 0.0; // 時間(ms)
  }

  // Bpmオブジェクト
  function Bpm() {
    this.measure = 0; // 小節(1～)
    this.point = 0.0; // 拍
    this.time = 0.0; // 時間(ms)
    this.value = 0.0; // BPMの値
  }

  // Stageオブジェクト
  function Stage() {
    this.x = 0;
    this.y = 0;
    this.r = 0;
  }

  /* function parse
   * 譜面データの文字列を解析、解析結果を格納したオブジェクトを返します
   * 引数1 : 譜面データを格納した文字列
   * 引数2 : 初期化フラグ
   * 戻り値 : 譜面データの解析結果を格納したオブジェクト
   */
  SBRS.parse = function(sbrScriptStr, initFlag) {

    var sbrScriptArray = sbrScriptStr.split(/\r\n|\r|\n/g);

    // sbrsオブジェクトの初期化
    if (initFlag || typeof initFlag === "undefined") {
      initSbrs();
      sbrs.readyState = 3;
    }

    // レーン数を取得
    sbrs.laneCount = getLaneCount(sbrScriptArray);

    // コメント、空行、想定外の記述を削除
    sbrScriptArray = scriptStrNormalization(sbrScriptArray, sbrs.laneCount);

    var measureS = 4.0;
    var measureB = 4.0;
    var time = 0.0;
    var lastTime = 0.0;
    var bpm = 120.0;
    var scroll = 1.0;
    var laneCount = sbrs.laneCount;
    var lastLaneType = [];
    var bpmValueArray = [];
    var i, iLen;
    var loop;

    // 上から下までのループ
    for (i = 0, measure = 1, iLen = sbrScriptArray.length; i < iLen; i++, measure++) {

      // 小節の行数取得
      var measureLineCount = getMeasureLineCount(sbrScriptArray, i);

      // 1小節のループ
      for (var measureLineIndex = 0; i < iLen && sbrScriptArray[i].charAt(0) !== ","; i++) {

        var line = sbrScriptArray[i];
        var point = measureLineIndex / measureLineCount * measureS;

        // 命令行の処理
        if (line.charAt(0) === "#") {

          // 曲名を取得
          if (line.match(/^#TITLE:/i) !== null) {
            sbrs.title = line.slice("#TITLE:".length);
          }
          // アーティストを取得
          else if (line.match(/^#ARTIST:/i) !== null) {
            sbrs.artist = line.slice("#ARTIST:".length);
          }
          // 音声ファイル名を取得
          else if (line.match(/^#SOUND:/i) !== null) {
            sbrs.sound = line.slice("#SOUND:".length);
            if (sbrs.url !== "" && sbrs.url.lastIndexOf("/") !== -1) {
              sbrs.soundUrl = sbrs.url.substr(0, sbrs.url.lastIndexOf("/") + 1) + sbrs.sound;
            } else {
              sbrs.soundUrl = sbrs.sound;
            }
          }
          // 音声ファイルの音量を取得
          else if (line.match(/^#SOUNDVOLUME:/i) !== null) {
            sbrs.soundVolume = parseFloat(line.slice("#SOUNDVOLUME:".length));
          }
          // 再生開始タイミングを取得
          else if (line.match(/^#OFFSET:/i) !== null) {
            sbrs.offset = parseFloat(line.slice("#OFFSET:".length));
          }
          // 難易度を取得
          else if (line.match(/^#LEVEL:/i) !== null) {
            sbrs.level = parseInt(line.slice("#LEVEL:".length));
          }
          // スクロール速度を取得
          else if (line.match(/^#SCROLL:/i) !== null) {
            scroll = parseFloat(line.slice("#SCROLL:".length));
          }
          // 判定範囲を取得
          else if (line.match(/^#JUDGERANGE:/i) !== null) {
            sbrs.judgeRange = parseFloat(line.slice("#JUDGERANGE:".length));
          }
          // BPMを取得
          else if (line.match(/^#BPM:/i) !== null) {
            var bpmObj = new Bpm();
            bpmObj.value = parseFloat(line.slice("#BPM:".length));
            bpmObj.measure = measure;
            bpmObj.point = point;
            bpmObj.time = time;
            sbrs.bpm.push(bpmObj);
            bpmValueArray.push(bpmObj.value);

            // 現在のBPM設定
            bpm = bpmObj.value;
          }
          // STAGEを取得
          else if (line.match(/^#STAGE:/i) !== null) {
            var stageValue = line.slice("#STAGE:".length).match(/([\d\-\.]+),([\d\-\.]+),([\d\-\.]+)/);
            if (stageValue !== null) {
              var stageObj = new Stage();
              stageObj.x = stageValue[1];
              stageObj.y = stageValue[2];
              stageObj.r = stageValue[3];
              sbrs.stage.push(stageObj);
            }
          }
          // 拍子を取得
          else if (line.match(/^#MEASURE:/i) !== null) {
            if (measureLineIndex === 0) {
              var measureValue = line.slice("#MEASURE:".length).match(/([\d\-\.]+)\/([\d\-\.]+)/);
              if (measureValue !== null) {
                // 小数点以下は切り捨て
                measureS = parseInt(measureValue[1]);
                measureB = parseInt(measureValue[2]);
              }
            }
          }
          // マーカー行の処理
        } else {

          // 1～nレーンのループ
          for (var lane = 1; lane <= laneCount; lane++) {
            var type = parseInt(line.charAt(lane - 1));
            var typeTmp = type;
            if (type !== 0) {

              for (loop = 0; loop < 2; loop++) {

                if (loop === 0) {
                  // ロングマーカーの終端が見つからなかった場合は、ロングマーカーの終端を追加する
                  if (lastLaneType[lane - 1] === 2 && type !== 3) {
                    type = 3;
                  } else {
                    continue;
                  }
                }

                var markerObj = new Marker();
                markerObj.measure = measure;
                markerObj.point = point;
                markerObj.time = time;
                markerObj.type = type;
                markerObj.lane = lane;
                markerObj.bpm = bpm;
                markerObj.scroll = scroll;
                markerObj.pair = -1;
                sbrs.marker.push(markerObj);

                type = typeTmp;

                lastLaneType[lane - 1] = type;
              }
            }
          }
          time += 240000.0 / bpm * (measureS / measureB) / measureLineCount;
          measureLineIndex++;
        }
      }

      // 1小節の終了処理
      var measureObj = new Measure();
      measureObj.measure = measure;
      measureObj.valueS = measureS;
      measureObj.valueB = measureB;
      measureObj.time = lastTime;
      measureObj.scroll = scroll;
      sbrs.measure.push(measureObj);
      lastTime = time;
    }

    // ロングマーカーの中間判定情報付与
    addLongHoldData();

    // フィーバーゲージの情報付与
    addFeverGaugeData();

    // 終了時間
    sbrs.endTime = time;

    // コンボ数の理論値
    sbrs.comboCount = getComboCount();

    // オブジェクト数
    sbrs.bpmCount = sbrs.bpm.length;
    sbrs.measureCount = sbrs.measure.length;
    sbrs.markerCount = sbrs.marker.length;

    // マーカー数
    markerCount();

    // BPMの最大、最小値取得
    sbrs.maxBpm = Math.max.apply(null, bpmValueArray);
    sbrs.minBpm = Math.min.apply(null, bpmValueArray);

    // 読み込み完了
    sbrs.readyState = 4;
    sbrs.progress = 100;

    return sbrs;
  };

  /* function load
   * 指定されたURLから譜面を読み込む
   * 引数1 : sbrスクリプトファイルのURL
   * 引数2 : 同期読み込みフラグ(true:非同期読み込み false:同期読み込み)
   * 引数3 : 読み込みが完了した時に呼び出すコールバック関数
   *        callback.success : 読み込み成功時に実行する関数
   *        callback.error   : 読み込み失敗時に実行する関数
   * 戻り値 : sbrスクリプトオブジェクト
   */
  SBRS.load = function(sbrScriptUrl, async, callback) {

    var xhr = new XMLHttpRequest();
    initSbrs();
    sbrs.url = sbrScriptUrl;

    xhr.open("get", sbrScriptUrl, async);

    // 同期読み込み
    if (!async) {

      xhr.send();
      sbrs.readyState = 3;
      if (xhr.status === 200) {
        SBRS.parse(xhr.responseText);
        if (callback && typeof callback.success === "function") {
          callback.success();
        }
      } else {
        console.error("譜面の読み込みに失敗しました(url:%s)", sbrScriptUrl);
        if (callback && typeof callback.error === "function") {
          callback.error();
        }
      }

      // 非同期読み込み
    } else {

      xhr.addEventListener("readystatechange", function() {
        sbrs.readyState = xhr.readyState;
        switch (xhr.readyState) {
          case 3:
            // 読み込み状況確認
            sbrs.progress = 0; // TODO 未実装
            sbrs.readyState = xhr.readyState;
            break;
          case 4:
            sbrs.progress = 99;
            sbrs.readyState = 3; // 譜面の解析が完了した時点で4(完了)とする

            try {

              // 読み込み成功
              if (xhr.status === 200) {

                // 読み込んだ譜面を解析
                SBRS.parse(xhr.responseText, false);
                if (callback && typeof callback.success === "function") {
                  callback.success();
                }

                // 読み込み失敗
              } else {

                throw new Error();
              }
            } catch (e) {
              console.error("譜面の読み込みに失敗しました(url:%s)", sbrScriptUrl);
              if (callback && typeof callback.error === "function") {
                callback.error();
              }
            }
            break;
          default:
            sbrs.readyState = xhr.readyState;
            break;
        }
      });
      xhr.send();
    }

    return sbrs;
  };

  /* function getLaneCount
   * 譜面のレーン数を取得する (デフォルト:3)
   * 引数1 : 譜面データを格納した配列
   * 戻り値 : 譜面のレーン数
   */
  function getLaneCount(sbrScriptArray) {
    var laneCount = 3;
    for (var i = 0, len = sbrScriptArray.length; i < len; i++) {
      var line = sbrScriptArray[i];
      if (line.charAt(0) === "#" && line.match(/^#LANE:/i) !== null) {
        laneCount = parseInt(line.slice("#LANE:".length));
      }
    }
    return laneCount;
  }

  /* function scriptStrNormalization
   * 配列に格納した譜面を正規化。コメントや異常な記述を除去する
   * 引数1 : 譜面データを格納した配列
   * 引数2 : 譜面データのレーン数
   * 戻り値 : 正規化した譜面データの配列
   */
  function scriptStrNormalization(sbrScriptArray, laneCount) {
    var blankLane = (function() {
      var blankChar = "0";
      var blankStr = "";
      var i, iLen;
      for (i = 0; i < laneCount; i++) {
        blankStr += blankChar;
      }
      return blankStr;
    }());
    var lineCount = 0;
    var i, iLen;

    for (i = 0, iLen = sbrScriptArray.length; i < iLen; i++) {
      var line = sbrScriptArray[i];

      // コメント除去
      if (line.indexOf("//") !== -1) {
        line = line.substring(0, line.indexOf("//"));
      }

      // 想定外の文字除去
      if (line.charAt(0) !== "#") {
        // 数字とセミコロン以外を除去
        line = line.replace(/[^0-3,]/g, "");
      }

      // 空行除去
      if (line.length === 0) {
        sbrScriptArray.splice(i, 1);
        i--;
        iLen--;
      } else {

        if (line.charAt(0) !== "#") {
          // 先頭以外のカンマを次の行に
          if (line.substr(1).indexOf(",") !== -1) {
            var commaIndex = line.substr(1).indexOf(",") + 1;
            sbrScriptArray.splice(i + 1, 0, ",");
            iLen++;
            if (line.substr(commaIndex).length !== 1) {
              sbrScriptArray.splice(i + 2, 0, line.substr(commaIndex + 1));
              iLen++;
            }
            line = line.substr(0, commaIndex);
          }
          // laneCount以上の記述を分割
          if (line.length > laneCount) {
            for (var j = 1, jLen = Math.ceil(line.length / laneCount); j < jLen; j++) {
              var str = (line.substr(j * laneCount, laneCount) + blankLane).substr(0, laneCount);
              sbrScriptArray.splice(i + j, 0, str);
              iLen++;
            }
            line = line.substr(0, laneCount);
          }

          // laneCount未満の記述を保管
          if (line.length < laneCount) {
            line = (line + blankLane).substring(0, laneCount);
          }

          if (line.charAt(0) !== ",") {
            lineCount++;
            sbrScriptArray[i] = line;
          } else {
            // カンマのみの小節に空マーカー付与
            if (lineCount === 0) {
              var blankLine = blankLane.substr(0, laneCount);
              sbrScriptArray.splice(i, 0, blankLine);
              i++;
              iLen++;
            }
            lineCount = 0;
          }
        }
      }
    }
    return sbrScriptArray;
  }

  /* function getMeasureLineCount
   * インデックスで指定した小節のマーカー行の行数を取得する
   * 引数1 : 譜面データを格納した配列
   * 引数2 : 行数を確認したい小節の先頭行のindex
   * 戻り値 : インデックスで指定した小節のマーカー行の行数
   */
  function getMeasureLineCount(sbrScriptArray, index) {

    var measureCount = 0;

    for (var i = index, len = sbrScriptArray.length; i < len; i++) {
      var line = sbrScriptArray[i];
      if (line.charAt(0) === ",") {
        break;
      }
      if (line.charAt(0) !== "#") {
        measureCount++;
      }
    }
    return measureCount;
  }

  /* function addLongHoldData
   * sbrs.markerにロングマーカーのホールド情報を付与します
   * 4/4拍子の場合、1小節フルのロングマーカーだと4コンボ付与
   * 7/8拍子の場合、1小節フルのロングマーカーだと7コンボ付与
   * 戻り値 : なし
   */
  function addLongHoldData() {
    for (var i = 0, len = sbrs.marker.length; i < len; i++) {
      var marker = sbrs.marker[i];
      if (marker.type == 2) {
        var lane = marker.lane;
        var endIndex = getLongEndIndex(i, lane);
        if (endIndex !== -1) {
          var endMarker = sbrs.marker[endIndex];
          marker.pair = endIndex;
          endMarker.pair = i;
          marker.long = [];
          var startMeasure = marker.measure;
          var endMeasure = endMarker.measure;
          var startPoint = marker.point;
          var endPoint = endMarker.point;
          for (var measure = startMeasure; measure <= endMeasure; measure++) {
            var measureS = sbrs.measure[measure - 1].valueS;
            var pointInit = (measure === startMeasure) ? Math.ceil(startPoint) : 0;
            var pointTarget = (measure !== endMeasure) ? measureS : endPoint;
            for (var point = pointInit; point < pointTarget; point++) {
              var markerObj = new Marker();
              markerObj.measure = measure;
              markerObj.point = point;
              markerObj.time = SBRS.getTimeFromMeasurePoint(measure, point);
              markerObj.type = 4;
              markerObj.lane = lane;
              marker.long.push(markerObj);
            }
          }
        } else {
          // ロングマーカーの終端が見つからなかった場合、通常のマーカーとして扱う
          marker.type = 1;
          console.warn("ロングマーカーの終端情報が見つかりませんでした(" + marker.measure + "小節, " + marker.point + "拍目)");
        }
      }
    }
  }

  /* function getLongEndIndex
   * ロングの終端のindexを取得します
   * 引数1 : sbrs.markerのロングマーカーのindex
   * 引数2 : sbrs.markerのロングマーカーのlane
   * 戻り値 : ロングマーカー終端のindex(見つからない場合は-1を返す)
   */
  function getLongEndIndex(index, lane) {
    var endIndex = -1;
    for (var i = index + 1, len = sbrs.marker.length; i < len; i++) {
      var marker = sbrs.marker[i];
      if (marker.lane === lane) {
        if (marker.type === 3) {
          endIndex = i;
        }
        break;
      }
    }
    return endIndex;
  }

  /* function getTimeFromMeasurePoint
   * 小節と拍数を元に時間を取得します
   * 引数1 : 時間を確認したい小節
   * 引数2 : 時間を確認したい拍数
   * 戻り値 : 時間(ms)
   */
  SBRS.getTimeFromMeasurePoint = function(measure, point) {
    var bpmIndex = -1;
    var time = 0.0;
    var measureObj = sbrs.measure[measure - 1];
    var bpmObj = null;
    var bpm = 120.0;
    for (var i = 0, len = sbrs.bpm.length; i < len; i++) {
      bpmObj = sbrs.bpm[i];
      if (bpmObj.measure < measure) {
        bpm = sbrs.bpm[i].value;
      } else if (bpmObj.measure === measure) {
        if (point >= bpmObj.point) {
          bpm = sbrs.bpm[i].value;
          bpmIndex = i;
        } else {
          break;
        }
      }
    }
    if (bpmIndex === -1) {
      time = measureObj.time + (240000.0 / bpm * (measureObj.valueS / measureObj.valueB) * (point / measureObj.valueS));
    } else {
      // TODO:以下未テスト
      bpmObj = sbrs.bpm[bpmIndex];
      if (bpmObj.point === point) {
        time = bpmObj.time;
      } else {
        time = bpmObj.time + (240000.0 / bpm * (measureObj.valueS / measureObj.valueB) * ((point - bpmObj.point) / measureObj.valueS));
      }
    }
    return time;
  };

  /* function getMeasurePointFromTime
   * 時間から小節と拍数を取得します
   * 引数1 : 時間(ms)
   * 戻り値 : 小節と拍数を格納したオブジェクト({measure:value, point:value})
   */
  SBRS.getMeasurePointFromTime = function(time) {

    var measureIndex;
    var measureObj;
    var nextMeasureObj;
    var measureValue, pointValue;
    var measureS, measureB;
    var bpmObj;
    var bpmIndex;
    var bpm;
    var i, iLen;

    measureIndex = sbrs.measureCount - 1;
    measureValue = sbrs.measureCount;

    // 該当小節確認
    for (i = 0, iLen = sbrs.measureCount - 1; i < iLen; i++) {
      measureObj = sbrs.measure[i];
      nextMeasureObj = sbrs.measure[i + 1];
      if (time >= measureObj.time && time < nextMeasureObj.time) {
        measureIndex = i;
        measureValue = measureObj.measure;
        break;
      }
    }

    measureObj = sbrs.measure[measureIndex];
    measureS = measureObj.valueS;
    measureB = measureObj.valueB;

    // 該当小節のBPM変更確認
    bpmIndex = -1;
    for (i = 0, iLen = sbrs.bpmCount; i < iLen; i++) {
      bpmObj = sbrs.bpm[i];
      if (bpmObj.measure < measureValue) {
        bpm = bpmObj.value;
      } else if (bpmObj.measure === measureValue) {
        if (time >= bpmObj.time) {
          bpmIndex = i;
        }
      }
    }

    if (bpmIndex !== -1) {
      // 該当小節のBPM変更あり

      bpmObj = sbrs.bpm[bpmIndex];

      // 拍数取得
      pointValue = bpmObj.point + measureS * ((time - bpmObj.time) / (240000.0 / bpmObj.value * (measureS / measureB)));

    } else {
      // 該当小節のBPM変更なし

      // 1小節の時間
      var measureTime = 240000.0 / bpm * (measureS / measureB);

      // 拍数取得
      pointValue = measureS * ((time - measureObj.time) / measureTime);
    }

    // 拍数が1小節の拍数以上になった場合
    if (pointValue > measureS) {
      measureValue += parseInt(pointValue / measureS);
      pointValue = pointValue % measureS;
    }

    return {
      measure: measureValue,
      point: pointValue
    };
  };

  /* function addFeverGaugeData
   * フィーバーゲージの長さを取得します
   * 戻り値 : フィーバーゲージの長さ
   */
  function addFeverGaugeData() {
    var count = 0;
    for (var i = 0, iLen = sbrs.marker.length; i < iLen; i++) {
      if (sbrs.marker[i].type === 1 || sbrs.marker[i].type === 2) {
        count++;
      }
    }
    // フィーバーゲージの長さ
    sbrs.feverGaugeLength = Math.floor(count * 2.0 * 0.8);

    // Feverに必要なマーカー数
    sbrs.fever = Math.ceil(sbrs.feverGaugeLength / (4.0 * 1));
    sbrs.feverHigh = Math.ceil(sbrs.feverGaugeLength / (4.0 * 7));
  }

  /* function getComboCount
   * コンボ数の理論値を取得します
   * 戻り値 : コンボ数の理論値
   */
  function getComboCount() {
    var count = 0;
    for (var i = 0, iLen = sbrs.marker.length; i < iLen; i++) {
      if (sbrs.marker[i].type === 1 || sbrs.marker[i].type === 2) {
        count++;
        if (sbrs.marker[i].type === 2) {
          count++;
          count += sbrs.marker[i].long.length;
        }
      }
    }
    return count;
  }

  /* function markerCount
   * マーカーオブジェクトの数をカウントします
   * 戻り値 : なし
   */
  function markerCount() {

    var i, iLen;

    for (i = 0, iLen = sbrs.marker.length; i < iLen; i++) {
      switch (sbrs.marker[i].type) {
        case 1:
          sbrs.normalMarkerCount++;
          break;
        case 2:
          sbrs.longMarkerCount++;
          break;
        default:
          break;
      }
    }
  }

  return SBRS;
}());