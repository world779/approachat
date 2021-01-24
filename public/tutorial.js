function highlightElement(element) {
  const style = window.getComputedStyle(element);
  const bgColor = style.getPropertyValue("background-color");
  const borderColor = style.getPropertyValue("border-color");
  var loopCompleted = 0;
  var tl = anime.timeline({
    duration: 700,
    loop: true,
    autoplay: false,
  });

  element.style.borderColor = "#dc3545";
  element.style.borderWidth = "3px";

  tl.loopComplete = function(anim) {
    loopCompleted++;
    if (loopCompleted > 5){
      tl.pause();
      anime({
        targets: element,
        borderColor: borderColor,
        borderWidth: 1,
      });
    }
  }

  tl.add({
    targets: element,
    backgroundColor: "#ffffe0",
  }).add(
    {
      targets: element,
      backgroundColor: bgColor,
    }
  );
}
