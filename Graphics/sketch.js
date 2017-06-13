var w;

var g, gl, buffer, shader;
var vertexAtrribute, vertices = new Float32Array([
    -1.0, -1.0,
    -1.0, 1.0,
    1.0, 1.0,
    -1.0, -1.0,
    1.0, 1.0,
    1.0, -1.0
  ]),
  ptsPerVertex = 2;

var uniformAspect, uniformTime,
    uniformSkycolor,
    uniformCloudcount,
    uniformFallingparticles,
    uniformWindspeed,
    uniformWindbearing,
    uniformMoonphase,

    uniformYscale,
    uniformYoffset;

var fragShader, fragShaderSrc = `
precision lowp float;

#define PI 3.141592

varying vec2 uv;
varying vec2 shade;
uniform float aspect;
uniform float time;
uniform int skycolor;
uniform int cloudcount;
uniform int fallingparticles;
uniform float windspeed;
uniform float windbearing;
uniform float moonphase;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
vec2 rand2(vec2 co){
  return vec2(rand(co), rand(co * vec2(2.354, 5.298)));
}
float noise(vec2 co){
  vec2 fco = floor(co);
  vec2 rco = -0.5 * cos(fract(co) * PI) + 0.5;
  return mix(mix(rand(fco), rand(fco + vec2(1.,0)), rco.x),
             mix(rand(fco + vec2(0,1.)), rand(vec2(fco) + vec2(1.)),rco.x), rco.y);
}
float fractalNoise(vec2 coord){
  return noise(coord)/2.0+noise(coord*2.0)/4.0+noise(coord*4.0)/4.0;
}

float bodyBrightness(vec2 coord){
  float dist = max(length(coord - vec2(0.5, 1.3)), 0.11);
  return 0.11 * 0.11 / dist / dist;
}

vec4 cloudColor(vec2 coord){

  if(cloudcount == 0) return vec4(0.0);
  vec2 windoffset = -0.1*time*windspeed*vec2(sin(PI * windbearing / 180.0), cos(PI * windbearing / 180.0));

  float density = fractalNoise(4.0 * coord+windoffset)/2.0+fractalNoise(2.0*(4.0 * coord+windoffset*1.1))/4.0+fractalNoise(4.0*(4.0 * coord+windoffset*1.2))/4.0;

  // float sunnyFactor = (1.0 - float()/2.0);
  density = clamp(mix(0.2+0.8*density, 2.0*density - 1.0, 2.0 - float(cloudcount)), 0.0, 1.0);// (1.0 - sunnyFactor));

  density = pow(density, 0.8);
  // density = 1.0-sqrt(1.0 - density*density);
  float lightEffect = (1.0 - min(4.0 * density, 1.0)) * bodyBrightness(coord);
  float alpha = min(8.0*density, 1.0);

  vec3 cloudcolor = skycolor == 0? vec3(0.82, 0.82, 0.9) - density*0.4:
                    skycolor == 1? vec3(0.18, 0.18, 0.2)*1.2 - density*0.15 :
                    skycolor == 3? mix(vec3(1.0, 0.7, 0.3), vec3(0.0, 0.0, 0.2), density):
                                   vec3(0.84, 0.84, 0.86) - density*0.7;

  return vec4(mix(cloudcolor, vec3(1.0), lightEffect), alpha);
  ;
}

float lessThan(float a, float b, float delta){
  return clamp((b - a)/delta, 0., 1.);
}
vec4 sunColor(vec2 coord){
  return mix(vec4(vec3(0.3, 0.5, 0.7) + vec3(0.3) * coord.y / aspect, 1.0),
         vec4(1.0, 1.0, 0.93, 1.0), lessThan(length(coord - vec2(0.5, 1.3)), 0.11, 0.001));
}
vec4 moonColor(vec2 coord){
  float moonCoordX = (coord.x - vec2(0.5, 1.3).x) / 0.11 / sqrt(1.0 - pow((coord.y - vec2(0.5, 1.3).y) / 0.11, 2.0));
  return mix(vec4(vec3(0.05, 0.1, 0.11) + vec3(0.1) * coord.y / aspect, 1.0),
         vec4(0.9, 0.9, 0.9, 1.0), lessThan(length(coord - vec2(0.5, 1.3)), 0.11, 0.002) * lessThan(moonCoordX, (-1.0 + 4.0 * moonphase), 0.02) * lessThan((-3.0 + 4.0 * moonphase), moonCoordX, 0.02));
}
vec4 sunsetColor(vec2 coord){
  float sunsetcoord = coord.y/aspect;
  return vec4(mix(mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.95, 0.4), min(3.0*sunsetcoord, 1.0)),mix(vec3(0.45, 0.6, 0.8), vec3(0.3, 0.35, 0.45), max(3.0*sunsetcoord-2.0, 0.0)), clamp(3.0*sunsetcoord-1.0, 0.0, 1.0)), 1.0);
}
vec4 grayColor(vec2 coord){
  return vec4(vec3(0.25, 0.25, 0.3) + vec3(0.2) * coord.y / aspect, 1.0);
}
vec4 skyColor(vec2 coord){
  vec4 skycol = (skycolor == 0? sunColor(coord) :
         skycolor == 1? moonColor(coord) :
         skycolor == 3? sunsetColor(coord) :
                        grayColor(coord));

  vec4 cloudcolor = cloudColor(coord);
  return mix(skycol,
         vec4(cloudcolor.xyz, 1.0), cloudcolor.w);
}

vec2 rippleCurve(float center){
  center *= 100.0;
  return //center > PI*2.0 || center < -PI*2.0 ? vec2(0.0, 1.0) :
  normalize(vec2(
    sin(center)/(1.0 + center * center / 10.0),
    1.0
  ));
}

vec3 rippleDisplace(vec2 coord, vec2 center, float time){
  vec2 offset = coord - center;
  float distance = length(offset);
  vec2 normed = normalize(offset);
  vec2 rippleCenter = vec2(max(0.0, 1.0 - 0.3 * time), 1.0) * 0.1 * rippleCurve(distance - 0.5*time);
  return vec3(rippleCenter.x * normed, rippleCenter.y);
}
void main() {
  vec2 coord = uv * vec2(1.0, aspect);
  vec3 displaced = vec3(0.0);

  vec2 windoffset = -0.7*time*windspeed*vec2(sin(PI * windbearing / 180.0), cos(PI * windbearing / 180.0));
  displaced+=0.05*0.1*min(windspeed, 15.0)*normalize(vec3(
  noise(windoffset + 10.0*coord) - noise(windoffset + 10.0*coord + vec2(1.0, 0)),
  noise(windoffset + 10.0*coord) - noise(windoffset + 10.0*coord + vec2(0, 1.0)),
  2.0));

  if(fallingparticles == 1){
    float delay, rTime, period;
  ${Array.apply(null, Array(16)).map((d, n, a) =>
    `delay = ${(n+Math.random())/a.length};
    period = 1.0;
    rTime = time + period * delay;
    displaced += (1.0-mod(rTime, period)/period) * rippleDisplace(coord, vec2(1.0, aspect) * rand2(vec2(delay, floor(rTime/period) + 0.5)), mod(rTime, period));
  `).join("\n")}
  }
  // vec3 normal = normalize(vec3(displaced));
//   float specular = clamp((dot(normal, normalize(vec3(0.3, 0.3, 1.0))) - 0.95) * 50.0, 0.0, 1.0);
//   float shade = min(0.9+0.8*(coord.y/aspect), 1.0);
  gl_FragColor = skyColor(coord + displaced.xy);// + specular * 0.5;
  // gl_FragColor.xyz *= shade;
  gl_FragColor.xyz *= pow(clamp(shade.y*15.0 + 0.8, 0.0, 1.0), 0.5);
}
`;

var vertShader, vertShaderSrc = `
attribute vec2 position;
varying vec2 uv;
varying vec2 shade;
uniform float yscale;
uniform float yoffset;

void main() {
  vec2 newpos = position * vec2(1.0, yscale) + vec2(0.0, yoffset);
  gl_Position = vec4(newpos, 0.0, 1.0);//(0.85+0.15*newpos.y));
  uv = 0.5 * newpos + 0.5;
  shade = (0.5 * position + 0.5) * vec2(1.0, yscale);
}
`;


var bloomLowres = 2, bloomSamples = 40,
  bfragShader, bfragShaderSrc = `
precision lowp float;

#define PI 3.141592
varying vec2 uv;
uniform sampler2D sampler;

vec4 bloommask(vec4 color){
  return vec4(color.xyz, clamp(10.0*(dot(color.xyz, vec3(1.0, 1.0, 1.0)) - 2.5), 0.0, 1.0));
}
void main(){
  gl_FragColor = vec4(0.0);
  ${Array.apply(null, Array(bloomSamples)).map((_, i, a) =>{
    // var dx = (i%10 - 5)*((1*bloomLowres)/360);
    // var dy = 0.;
    var ds = (1.001-0.025*i);//*((1*bloomLowres)/640);
    var factor = 2.0*(1.001 - i/bloomSamples)/bloomSamples;
  return `
    gl_FragColor += ${factor} * bloommask(texture2D(sampler, vec2(${ds})*(uv - vec2(0.5, 0.75))+vec2(0.5, 0.75)));
  `}).join("")}
}
`,
  bvertShader, bvertShaderSrc = `
attribute vec2 position;
varying vec2 uv;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  uv = 0.5 * position + 0.5;
}
`, bbuffer, bshader, btexture;

function setup() {
  createCanvas(360, 640);

  // w = requestWeather('data/mit-tuesday.json');
  // w = requestWeather('data/mit-wednesday.json');
  // w = requestWeather('data/cambridge.json');
  // w = requestWeather('data/indianapolis.json');
  // w = requestWeather('data/alcatraz.json');
  w = requestWeather(42.3596764, -71.0958358, '18125d4f0046c79c0d481bb56b530b22');
    // noLoop();
  g = createGraphics(width, height, WEBGL);
  b = createGraphics(width/pixelDensity()/bloomLowres, height/pixelDensity()/bloomLowres, WEBGL);

  gl = g._renderer.GL;
  bl = b._renderer.GL;

  // Setup rectangle
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Setup shaders
  vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertShaderSrc);
  gl.compileShader(vertShader);

  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.log("Vertex Shader is sad");
    console.log(gl.getShaderInfoLog(vertShader));
  }

  fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragShaderSrc);
  gl.compileShader(fragShader);

  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.log("Fragment Shader is sad");
    console.log(gl.getShaderInfoLog(fragShader));
  }

  shader = gl.createProgram();
  gl.attachShader(shader, vertShader);
  gl.attachShader(shader, fragShader);
  gl.linkProgram(shader);

  if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
    console.log("Shaders are sad");
  }

  vertexAttribute = gl.getAttribLocation(shader, "position");
  gl.enableVertexAttribArray(vertexAttribute);
  gl.vertexAttribPointer(vertexAttribute, ptsPerVertex, gl.FLOAT, false, 0, 0);

  uniformAspect = gl.getUniformLocation(shader, "aspect");
  uniformTime = gl.getUniformLocation(shader, "time");
  uniformSkycolor = gl.getUniformLocation(shader, "skycolor");
  uniformCloudcount = gl.getUniformLocation(shader, "cloudcount");
  uniformFallingparticles = gl.getUniformLocation(shader, "fallingparticles");
  uniformWindspeed = gl.getUniformLocation(shader, "windspeed");
  uniformWindbearing = gl.getUniformLocation(shader, "windbearing");
  uniformMoonphase = gl.getUniformLocation(shader, "moonphase");

  uniformYscale = gl.getUniformLocation(shader, "yscale");
  uniformYoffset = gl.getUniformLocation(shader, "yoffset");

  // Setup rectangle
  bbuffer = bl.createBuffer();
  bl.bindBuffer(bl.ARRAY_BUFFER, bbuffer);
  bl.bufferData(bl.ARRAY_BUFFER, vertices, bl.STATIC_DRAW);

  // Setup shaders
  bvertShader = bl.createShader(bl.VERTEX_SHADER);
  bl.shaderSource(bvertShader, bvertShaderSrc);
  bl.compileShader(bvertShader);

  if (!bl.getShaderParameter(bvertShader, bl.COMPILE_STATUS)) {
    console.log("Vertex Shader is sad");
    console.log(bl.getShaderInfoLog(bvertShader));
  }

  bfragShader = bl.createShader(bl.FRAGMENT_SHADER);
  bl.shaderSource(bfragShader, bfragShaderSrc);
  bl.compileShader(bfragShader);

  if (!bl.getShaderParameter(bfragShader, bl.COMPILE_STATUS)) {
    console.log("Fragment Shader is sad");
    console.log(bl.getShaderInfoLog(bfragShader));
  }

  bshader = bl.createProgram();
  bl.attachShader(bshader, bvertShader);
  bl.attachShader(bshader, bfragShader);
  bl.linkProgram(bshader);

  if (!bl.getProgramParameter(bshader, bl.LINK_STATUS)) {
    console.log("Shaders are sad");
  }

  bvertexAttribute = bl.getAttribLocation(bshader, "position");
  bl.enableVertexAttribArray(bvertexAttribute);
  bl.vertexAttribPointer(bvertexAttribute, ptsPerVertex, bl.FLOAT, false, 0, 0);

  btexture = bl.createTexture();
  bl.bindTexture(bl.TEXTURE_2D, btexture);
  bl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  bl.texParameteri(bl.TEXTURE_2D, bl.TEXTURE_WRAP_S, bl.CLAMP_TO_EDGE);
  bl.texParameteri(bl.TEXTURE_2D, bl.TEXTURE_WRAP_T, bl.CLAMP_TO_EDGE);
  bl.texParameteri(bl.TEXTURE_2D, bl.TEXTURE_MIN_FILTER, bl.LINEAR);
}

var iconHourly;
var windspeedHourly;
var windbearingHourly;
var timeHourly;
var moonphase = false;
var hoursToDraw = 1;
var hoursAnim = 0;
var hoursAnimT = 1;
var totalHours = 12;
var sunsetTime, sunriseTime;
// var hoursOffsetT = 1;
function mouseClicked(){
  hoursAnimT = hoursAnimT == 0? 1: 0;
}
function draw() {
  if (!w.ready) {
    background(0);
    return;
  }
  if(moonphase === false){
    moonphase = w.data.daily.data[0].moonPhase;
    iconHourly = w.getIcon("hourly")
    windSpeedHourly = w.getWindSpeed("hourly")
    windBearingHourly = w.getWindBearing("hourly")
    timeHourly = w.getTime("hourly")
    sunriseTime = (new Moment(w.data.daily.data[0].sunriseTime * 1000)).hour24()
    sunsetTime = (new Moment(w.data.daily.data[0].sunsetTime * 1000)).hour24()
  }

  blendMode(BLEND);
  background(0);

  hoursAnim = lerp(hoursAnim, hoursAnimT, 0.15);
  hoursToDraw = 1 + (totalHours - 1) * hoursAnim * hoursAnim;
  for(var hour = 0; hour < hoursToDraw; hour++){
    var icon = iconHourly[hour];
    var windspeed = windSpeedHourly[hour];
    var windbearing = windBearingHourly[hour];

    var skycolor = [
      // "rain",
      // "sleet",
      // "cloudy",
      // "snow",
      "fog",
      ].indexOf(icon) != -1 ? 2 :
      timeHourly[hour].hour24() == sunriseTime
      || timeHourly[hour].hour24() == sunsetTime? 3 :
      [
      "clear-night",
      "partly-cloudy-night"
      ].indexOf(icon) != -1
      || timeHourly[hour].hour24() < sunriseTime
      || timeHourly[hour].hour24() > sunsetTime? 1 :
      [
      "clear-day",
      "partly-cloudy-day"
      ].indexOf(icon) != -1 ? 0 : 0;

    var cloudcount = [
      "rain",
      "sleet",
      "cloudy",
      "fog",
      "snow"
      ].indexOf(icon) != -1 ? 2 :
      [
      "partly-cloudy-night",
      "partly-cloudy-day",
      "wind",
      ].indexOf(icon) != -1 ? 1 : 0;


    var fallingparticles = [
        "rain",
        "snow",
        "sleet"
      ].indexOf(icon) != -1 ? 1 : 0;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shader);
    gl.uniform1f(uniformAspect, height / width);
    gl.uniform1f(uniformTime, frameCount / 60);
    gl.uniform1i(uniformSkycolor, skycolor);
    gl.uniform1i(uniformCloudcount, cloudcount);
    gl.uniform1i(uniformFallingparticles, fallingparticles);
    gl.uniform1f(uniformWindspeed, windspeed);
    gl.uniform1f(uniformWindbearing, windbearing);
    gl.uniform1f(uniformMoonphase, moonphase);
    gl.uniform1f(uniformYscale, 1/hoursToDraw);
    gl.uniform1f(uniformYoffset, 1-2*(hour+0.5)/(hoursToDraw));

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / ptsPerVertex);

    blendMode(BLEND);
    image(g, 0, 0, width, height);

    noFill();
    strokeCap(ROUND);
    strokeJoin(ROUND);
    stroke(255, 100 * min(1, hoursToDraw - 1));
    strokeWeight(1.75);
    push();
    var clocksize = 30;
    translate(width - clocksize, height*(hour+0.5)/hoursToDraw);
    ellipse(0, 0, clocksize, clocksize);
    beginShape();
    vertex(0, -clocksize/3);
    vertex(0, 0);
    var rotation = TWO_PI*timeHourly[hour].hour()/12;
    vertex(clocksize/5 * Math.sin(rotation), -clocksize/5 * Math.cos(rotation));
    endShape();
    pop();
  }

  bl.clear(bl.COLOR_BUFFER_BIT | bl.DEPTH_BUFFER_BIT);

  bl.useProgram(bshader);
  bl.texImage2D(bl.TEXTURE_2D, 0, bl.RGBA, bl.RGBA, bl.UNSIGNED_BYTE, _renderer.canvas);

  bl.drawArrays(bl.TRIANGLES, 0, vertices.length / ptsPerVertex);

  blendMode(SCREEN);
  image(b, 0, 0, width, height);
}

function mod(a, b){
  return ((a % b) + b) % b;
}
