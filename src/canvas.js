function draw(){
  let canvas = document.getElementById("drawing-canvas");
  
  if(canvas.getContext){
    let ctx = canvas.getContext("2d");
    console.log("test")
    ctx.fillStyle='rgb(0,0,0)';
    ctx.fillRect(100,100,100,100);

  }else{
    
  }
}
