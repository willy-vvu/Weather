var w;

var Lato = {};
function setup() {
  createCanvas(360, 640);

  // w = requestWeather('data/mit-tuesday.json');
  // w = requestWeather('data/mit-tuesday.json');
  //w = requestWeather('data/cambridge.json');
  //w = requestWeather('data/indianapolis.json');
  //w = requestWeather('data/alcatraz.json');
  w = requestWeather(42.3596764, -71.0958358, '18125d4f0046c79c0d481bb56b530b22');
  // Lato.BlackItalic = loadFont("font/Lato-BlackItalic.ttf");
  // Lato.Black = loadFont("font/Lato-Black.ttf");
  // Lato.BoldItalic = loadFont("font/Lato-BoldItalic.ttf");
  // Lato.Bold = loadFont("font/Lato-Bold.ttf");
  // Lato.HairlineItalic = loadFont("font/Lato-HairlineItalic.ttf");
  Lato.Hairline = loadFont("font/Lato-Hairline.ttf");
  // Lato.Italic = loadFont("font/Lato-Italic.ttf");
  Lato.LightItalic = loadFont("font/Lato-LightItalic.ttf");
  // Lato.Light = loadFont("font/Lato-Light.ttf");
  // Lato.Regular = loadFont("font/Lato-Regular.ttf");
}

var motionBlurMax = Infinity;//0.25; // Max pixel motion, for adaptive motion blur

var partlyparticles = 7;
var cloudyparticles = 25;
var rainyparticles = 25;
var windyparticles = 25;
var cloudTop = 250;

var spawned = false;

var icon = "";
var windspeed = 0;
var temperature = 0;
function draw() {
  if (!w.ready) {
    background(0);
    return;
  }
  if(!icon){
    icon = w.getIcon();
    windspeed = w.getWindSpeed() * (w.getWindBearing() < 180 ? 1: -1);
    temperature = w.getTemperature();
    spawned = true;
  }

  var overcast = [
    "rain",
    "sleet",
    "cloudy",
    "fog"
    ].indexOf(icon) != -1;

  var night = [
    "partly-cloudy-night",
    "clear-night"
    ].indexOf(icon) != -1;

  blendMode(BLEND);
  background(0);
  blendMode(ADD);
  noStroke();

  var cloudcount = [
    "rain",
    "snow",
    "sleet",
    "cloudy"
    ].indexOf(icon) != -1 ? cloudyparticles :
    [
    "partly-cloudy-day",
    "partly-cloudy-night"
    ].indexOf(icon) != -1 ? partlyparticles : 0;

  textAlign(LEFT);
  textFont(Lato.LightItalic);
  for(var i = 0; i < cloudcount; i++) {
    var speedX = (1 + noise(i, 1)) * windspeed / 5;
    textSize(24 * (0.5 + 1 * noise(i, 1)));
    drawParticle("cloud", mod((noise(i, 5) * 10 * width + speedX * frameCount), 1.5 * width) - 0.5 * width, i / cloudcount * cloudTop, speedX, 0, 255, 255);
  }

  var fullscreenparticles = [
    "wind",
    "fog"
    ].indexOf(icon) != -1 ? icon : null;

  if(fullscreenparticles){
    for(var i = 0; i < windyparticles; i++) {
      var speedX = (1 + noise(i, 1)) * windspeed / 5;
      textSize(24 * (0.5 + 1 * noise(i, 1)));
      drawParticle(fullscreenparticles, mod((noise(i, 5) * 10 * width + speedX * frameCount), 1.5 * width) - 0.5 * width, i / windyparticles * height, speedX, 0, 255, 255);
    }
  }

  var fallingparticles = [
      "rain",
      "snow",
      "sleet"
    ].indexOf(icon) != -1 ? icon : null;

  if(fallingparticles){
    for(var i = 0; i < rainyparticles; i++) {
      var speedX = (1 + noise(i, 1)) * windspeed / 15;
      var speedY = (1 + noise(i, 2)) * (fallingparticles == "snow" ? 1.5: 4);
      textSize(24 * (0.5 + 1 * noise(i, 2)));
      var y = mod((noise(i, 4) * 10 * height + speedY * frameCount), 1.2 * height - cloudTop) + cloudTop - 50;
      drawParticle(fallingparticles, mod((noise(i, 5) * 10 * width + speedX * frameCount), 1.5 * width) - 0.5 * width, y, speedX, speedY, 255, 255 * constrain(map(y, cloudTop - 50, cloudTop, 0, 1),0 ,1));
    }
  }

  /*
  var body = [
      "clear-day",
      "partly-cloudy-day"
    ].indexOf(icon) != -1 ? "Sun" :
    [
      "clear-night",
      "partly-cloudy-night"
    ].indexOf(icon) != -1 ? "Moon" : null;

  if(body){
    textFont(Lato.Hairline);
    textAlign(CENTER, CENTER);
    textSize(80);
    blendMode(DIFFERENCE);
    fill(255);
    text(body, width/2, cloudTop/2);
    // No graphics, but here's a test
    // ellipse(width/2, 3*height/12, 2*cloudTop/3, 2*cloudTop/3);
  }*/

  textFont(Lato.Hairline);
  textAlign(CENTER, CENTER);
  textSize(120);
  blendMode(DIFFERENCE);
  fill(255);
  text(round(temperature)+"°", width/2, 2*height/3);

  if(overcast){
    blendMode(BLEND);
    background(255, 60)
  }
  if(!night && !overcast){
    blendMode(DIFFERENCE);
    background(255);
  }
}

function drawParticle(textValue, x, y, dx, dy, color, opacity) {
  var totalD = max(abs(dx), abs(dy));
  fill(color, opacity / max(1, ceil(totalD / motionBlurMax)))
  for(var t = 0; t <= totalD; t+=motionBlurMax){
    text(textValue, x + dx * (t / totalD), y + dy * (t / totalD));
  }
}

function mod(a, b){
  return ((a % b) + b) % b;
}
