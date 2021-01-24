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

const tutorials = [
  [
    {
      title: "ようこそapproachatへ！",
      text: "基本的な操作方法をお教えします！",
    },
    {
      title: "範囲を変えてみよう",
      text: "スライダーを動かすと伝わる範囲が変わります",
      element: document.getElementById("dist"),
    },
  ],
  [
    {
      title: "メッセージを送ってみよう",
      text: "フォームに文字を入力し，送信ボタンを押すとメッセージを送れます",
    },
    {
      title: "範囲を変えてみよう",
      text: "スライダーを動かすと伝わる範囲が変わります",
    },
    {
      title: "範囲",
      text: "スライダーを動かすと伝わる範囲が変わります",
    },
  ],
];

function tutorial(arr, chapterNum = 0, contentNum = 0) {
  const content = arr[chapterNum][contentNum];
  if (contentNum == 0) {
    $("#tutorial").modal();
  }
  $("#tutorial-title").text(content.title);
  $("#tutorial-text").text(content.text);

  $("#button-next").one("click", function (e) {
    if (contentNum == arr[chapterNum].length - 1) {
      $("#tutorial").modal("hide");
      if (chapterNum == arr.length - 1) return;
      if (content.element) {
        const [borderColor, bgColor, tl] = highlightElement(content.element);
        content.element.addEventListener(
          "click",
          function (e) {
            tl.pause();
            anime({
              targets: content.element,
              borderColor: borderColor,
              backgroundColor: bgColor,
              borderWidth: 1,
            });
            tutorial(arr, chapterNum + 1, 0);
          },
          {
            once: true,
          }
        );
      }
    } else {
      tutorial(arr, chapterNum, contentNum + 1);
    }
  });
}
