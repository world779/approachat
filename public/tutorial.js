const tutorials = [
  {
    title: "ようこそApproachatへ！",
    text:
      "Approachatはアバターを動かしながらチャットができるアプリです。今から基本的な操作方法をお教えします！",
    view: true,
  },
  {
    title: "アバターを動かしてみよう",
    text: "自分のアバターを自由に動かすことができます。",
  },
  {
    text: "画面の操作バー以外の部分をクリックしてみてください。",
    hide: true,
  },
  {
    element: document.getElementById("field"),
    event: "click",
  },
  {
    title: "範囲を変えてみよう",
    text:
      "青いバーをドラッグして動かすとメッセージが伝わる範囲が変わります。あなたのアバターの外側の円の中にいる人にあなたのメッセージが届きます。",
    view: true,
  },
  {
    text: "外側の円の大きさが変わるのを操作して試してみてください。",
    hide: true,
  },
  {
    element: document.getElementById("dist"),
    event: "click",
  },
  {
    title: "メッセージを送ってみよう",
    text: "フォームに文字を入力し，送信ボタンを押すとメッセージを送れます。",
    view: true,
  },
  {
    text: "送られた文字は送信ボタンの下の欄に表示されます。",
    hide: true,
  },
  {
    element: document.getElementById("msgForm"),
    event: "send",
  },
  {
    title: "視点操作",
    text: "フィールドを拡大縮小したり，自分を視点の中心に戻したりできます。",
    view: true,
  },
  {
    text: "操作バーの左下の「視点をリセット」ボタンを押してみてください。",
    hide: true,
  },
  {
    element: document.getElementById("viewTool"),
    event: "click",
  },
  {
    title: "さあ，チャットを始めよう！",
    text: "会話がされていそうなところへ近づいて話してみましょう",
    view: true,
    hide: true,
  },
];

$(document).keypress(function (e) {
  if (e.which == 13) {
    $("#button-next").click();
  }
});

function highlightElement(element) {
  const style = window.getComputedStyle(element);
  const bgColor = style.getPropertyValue("background-color");
  const borderColor = style.getPropertyValue("border-color");
  var loopCompleted = 0;
  var tl = anime.timeline({
    duration: 700,
    loop: true,
  });

  element.style.borderColor = "#dc3545";
  element.style.borderWidth = "3px";

  tl.add({
    targets: element,
    backgroundColor: "#ffffe0",
  }).add({
    targets: element,
    backgroundColor: bgColor,
  });

  return [borderColor, bgColor, tl];
}

function tutorial(arr, num = 0) {
  const content = arr[num];
  if (content.view) {
    $("#tutorial").modal();
  }
  if (content.title) $("#tutorial-title").text(content.title);
  if (content.text) $("#tutorial-text").text(content.text);
  if (content.element) {
    const [borderColor, bgColor, tl] = highlightElement(content.element);
    if (content.event) {
      $(content.element).one(content.event, function (e) {
        tl.pause();
        anime({
          targets: content.element,
          borderColor: borderColor,
          backgroundColor: bgColor,
          borderWidth: 1,
        });
        tutorial(arr, num + 1);
      });
    }
  } else {
    if (num == arr.length - 1) {
      $("#button-next").text("わかった！");
      $("#button-skip").text("もう一回！");
      $("#button-skip").one("click", function (e) {
        //うまくいかない
        $("#button-next").text("次へ");
        $("#button-skip").text("スキップ");
        tutorial(arr, 0);
      });
    }
    $("#button-next").one("click", function (e) {
      if (content.hide) $("#tutorial").modal("hide");
      if (num == arr.length - 1) return;
      tutorial(arr, num + 1);
    });
  }
}
