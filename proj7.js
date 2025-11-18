"use strict";

// Ali Burkemper, CS435, Project 7

// Final project, interactive solar system


var canvas;
var gl;

var numPositions  = 18; 

var texSize = 64;
var index = 0;

var program;

var positionsArray = [];
var colorsArray = [];
var texCoordsArray = [];
var normalsArray = []; // lighting

// camera
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;
var eye = vec3(0.0, 15.0, 105.0);
var at, up;

var convertId;

var orbit_flag = true; // orbit enabled


// texturing
var starfieldTex; // starfiekd
var mercuryTex; // mercury
var venusTex; // venus
var sunTex; // sun
var earthTex; // earth
var marsTex; // mars
var jupiterTex; // jupiter
var saturnTex; // saturn
var uranusTex; // uranus
var neptuneTex; // neptune
var saturnRingTex; // saturn's rings


var vBuffer, cBuffer, tBuffer, nBuffer;
// ring buffers
var ringVBuffer, ringCBuffer, ringTBuffer, ringNBuffer;
var numRingVertices;

// orbits
var orbitPaths = [];

var numVertices;
var uModelMatrixLoc;
var uIsBackgroundLoc;
var uUseTextureLoc;
var uLightPositionLoc;
var uNormalMatrixLoc;
var uIsSunLoc;
var uModelMatrixLoc;
var uIsLineLoc;


var texCoord = [
    vec2(0, 1),
    vec2(0, 0),
    vec2(1, 0),
    vec2(1, 1)
];

// functions to create sphere 
function triangle(a, b, c) {
    positionsArray.push(vec4(a[0], a[1], a[2], 1.0));
    positionsArray.push(vec4(b[0], b[1], b[2], 1.0));
    positionsArray.push(vec4(c[0], c[1], c[2], 1.0));
    
    normalsArray.push(vec4(a[0], a[1], a[2], 0.0));
    normalsArray.push(vec4(b[0], b[1], b[2], 0.0));
    normalsArray.push(vec4(c[0], c[1], c[2], 0.0));
    
    for (let p of [a, b, c]) {
        let u = 0.5 + Math.atan2(p[2], p[0]) / (2 * Math.PI);
        let v = 0.5 - Math.asin(p[1]) / Math.PI;
        texCoordsArray.push(vec2(u, v));
    }
    
    var color = vec4(1.0, 1.0, 1.0, 1.0);
    colorsArray.push(color);
    colorsArray.push(color);
    colorsArray.push(color);

    index += 3;
}

// more sphere function
function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
}

// more sphere function
function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

// sphere creator
function createSphere(subdivisions) {
    // Reset arrays
    positionsArray = [];
    colorsArray = [];
    texCoordsArray = [];
    normalsArray = [];
    index = 0;
    
    // Initial tetrahedron vertices (unit sphere)
    var va = vec4(0.0, 0.0, -1.0, 1);
    var vb = vec4(0.0, 0.942809, 0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
    var vd = vec4(0.816497, -0.471405, 0.333333, 1);
    
    tetrahedron(va, vb, vc, vd, subdivisions);
    
    return index; // Return number of vertices
}


function configureTexture( image , textureUnit) {
    var tex = gl.createTexture();
    gl.activeTexture(textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
         gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return tex;

    // gl.uniform1i(gl.getUniformLocation(program, "uTexMap"), 0);
}

//create ring geometry
// Add this function with your other geometry functions
function createRing(innerRadius, outerRadius, segments) {
    var ringPositions = [];
    var ringColors = [];
    var ringTexCoords = [];
    var ringNormals = [];
    
    for (var i = 0; i <= segments; i++) {
        var angle1 = (i / segments) * 2 * Math.PI;
        var angle2 = ((i + 1) / segments) * 2 * Math.PI;
        
        // Inner vertices
        var x1Inner = innerRadius * Math.cos(angle1);
        var z1Inner = innerRadius * Math.sin(angle1);
        var x2Inner = innerRadius * Math.cos(angle2);
        var z2Inner = innerRadius * Math.sin(angle2);
        
        // Outer vertices
        var x1Outer = outerRadius * Math.cos(angle1);
        var z1Outer = outerRadius * Math.sin(angle1);
        var x2Outer = outerRadius * Math.cos(angle2);
        var z2Outer = outerRadius * Math.sin(angle2);
        
        // Two triangles per segment
        // Triangle 1
        ringPositions.push(vec4(x1Inner, 0, z1Inner, 1.0));
        ringPositions.push(vec4(x1Outer, 0, z1Outer, 1.0));
        ringPositions.push(vec4(x2Inner, 0, z2Inner, 1.0));
        
        // Triangle 2
        ringPositions.push(vec4(x2Inner, 0, z2Inner, 1.0));
        ringPositions.push(vec4(x1Outer, 0, z1Outer, 1.0));
        ringPositions.push(vec4(x2Outer, 0, z2Outer, 1.0));
        
        // Normals (pointing up)
        for (var j = 0; j < 6; j++) {
            ringNormals.push(vec4(0, 1, 0, 0));
            ringColors.push(vec4(1, 1, 1, 1));
        }
        
        // Texture coordinates
        var u1 = i / segments;
        var u2 = (i + 1) / segments;
        ringTexCoords.push(vec2(u1, 0));
        ringTexCoords.push(vec2(u1, 1));
        ringTexCoords.push(vec2(u2, 0));
        ringTexCoords.push(vec2(u2, 0));
        ringTexCoords.push(vec2(u1, 1));
        ringTexCoords.push(vec2(u2, 1));
    }
    
    return {
        positions: ringPositions,
        normals: ringNormals,
        colors: ringColors,
        texCoords: ringTexCoords,
        numVertices: ringPositions.length
    };
}

// draw planet helper
function drawPlanet(x, y, z, scale, rotationY, isSun, isUranus) {
    var modelMatrix = mat4();
    modelMatrix = mult(modelMatrix, translate(x, y, z));

    if (isUranus) {
        var tiltMatrix = rotate(98, vec3(0, 0, 1));
        modelMatrix = mult(modelMatrix, tiltMatrix);

        var rotationMatrix = rotate(rotationY, vec3(0, 1, 0));
        modelMatrix = mult(modelMatrix, rotationMatrix);
    }
    else {
        var rotationMatrix = rotate(rotationY, vec3(0, 1, 0));
        modelMatrix = mult(modelMatrix, rotationMatrix);
    }

    var scaleMatrix = mat4();
    scaleMatrix[0][0] = scale;
    scaleMatrix[1][1] = scale;
    scaleMatrix[2][2] = scale;

    modelMatrix = mult(modelMatrix, scaleMatrix);

    // Send model matrix separately for lighting
    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));
    
    // Send combined for transformation
    var combinedMatrix = mult(modelViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(combinedMatrix));
    
    gl.uniform1i(uIsSunLoc, isSun ? 1 : 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// draw rings helper
function drawRing(x, y, z, scale, rotationY) {
    var modelMatrix = mat4();
    modelMatrix = mult(modelMatrix, translate(x, y, z));
    
    // var rotationMatrix = rotate(rotationY, vec3(0, 1, 0));
    // modelMatrix = mult(modelMatrix, rotationMatrix);
    
    var tiltMatrix = rotate(27, vec3(1, 0, 0));
    modelMatrix = mult(modelMatrix, tiltMatrix);

    var scaleMatrix = mat4();
    scaleMatrix[0][0] = scale;
    scaleMatrix[1][1] = scale;
    scaleMatrix[2][2] = scale;

    modelMatrix = mult(modelMatrix, scaleMatrix);

    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));
    
    var combinedMatrix = mult(modelViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(combinedMatrix));
    
    gl.uniform1i(uIsSunLoc, 0);
    
    // Bind ring buffers
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, ringVBuffer);
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, ringTBuffer);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, ringNBuffer);
    gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0);
    
    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, ringCBuffer);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, numRingVertices);
    
    // Rebind sphere buffers for planets
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
}

// create planet orbits geometry
function createPath(radius, segments) {
    var orbitVertices = [];
    
    for (var i = 0; i <= segments; i++) {
        var angle = (i / segments) * 2 * Math.PI;
        var x = radius * Math.cos(angle);
        var z = radius * Math.sin(angle);
        orbitVertices.push(vec4(x, 0, z, 1.0));
    }
    
    return {
        vertices: orbitVertices,
        numVertices: orbitVertices.length
    };
}

// draw the orbits
function drawOrbitPath(orbitIndex) {
    var modelMatrix = mat4();
    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));
    
    var combinedMatrix = mult(modelViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(combinedMatrix));
    
    // Bind orbit buffer
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitPaths[orbitIndex].buffer);
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    // Draw as lines
    gl.drawArrays(gl.LINE_LOOP, 0, orbitPaths[orbitIndex].numVertices);
    
    // Rebind sphere buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
}


window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    
    // // Disable backface culling
    // gl.disable(gl.CULL_FACE);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    // camera
    // modelViewMatrix = lookAt(vec3(0.0, 13.0, 15.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    projectionMatrix = perspective(80.0, canvas.width / canvas.height, 0.1, 500.0);

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    uIsBackgroundLoc = gl.getUniformLocation(program, "uIsBackground");
    uIsSunLoc = gl.getUniformLocation(program, "uIsSun");
    uLightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
    uNormalMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");  
    uModelMatrixLoc = gl.getUniformLocation(program, "uModelMatrix");
    uIsLineLoc = gl.getUniformLocation(program, "uIsLine");

    // gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // sphere geometry
    numVertices = createSphere(4);

    // ring geometry
    var ringData = createRing(1.5, 2.5, 100);
    numRingVertices = ringData.numVertices;

    // Create separate buffers for ring
    ringVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ringData.positions), gl.STATIC_DRAW);

    ringTBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringTBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ringData.texCoords), gl.STATIC_DRAW);

    ringNBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringNBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ringData.normals), gl.STATIC_DRAW);

    ringCBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringCBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ringData.colors), gl.STATIC_DRAW);


    // normal sphere buffers
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    // planet orbits
    var orbitRadii = [13.9, 17.2, 20.0, 25.2, 32.0, 45.4, 62.0, 80.0]; // Mercury through Neptune

    orbitRadii.forEach(function(radius) {
        var orbit = createPath(radius, 100);
        
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(orbit.vertices), gl.STATIC_DRAW);
        
        orbitPaths.push({
            buffer: buffer,
            numVertices: orbit.numVertices
        });
    });

    //
    // Initialize a texture
    //
    // starfield
    var starfield = document.getElementById("starfield");
    starfieldTex = configureTexture(starfield, gl.TEXTURE0);
    // mercury
    var mercury = document.getElementById("mercury");
    mercuryTex = configureTexture(mercury, gl.TEXTURE1);
    // venus
    var venus = document.getElementById("venus");
    venusTex = configureTexture(venus, gl.TEXTURE2);
    // sun
    var sun = document.getElementById("sun");
    sunTex = configureTexture(sun, gl.TEXTURE3);
    // earth
    var earth = document.getElementById("earth");
    earthTex = configureTexture(earth, gl.TEXTURE4);
    // mars
    var mars = document.getElementById("mars");
    marsTex = configureTexture(mars, gl.TEXTURE5);
    // jupiter
    var jupiter = document.getElementById("jupiter");
    jupiterTex = configureTexture(jupiter, gl.TEXTURE6);
    // saturn
    var saturn = document.getElementById("saturn");
    saturnTex = configureTexture(saturn, gl.TEXTURE7);
    // uranus
    var uranus = document.getElementById("uranus");
    uranusTex = configureTexture(uranus, gl.TEXTURE8);
    // neptune
    var neptune = document.getElementById("neptune");
    neptuneTex = configureTexture(neptune, gl.TEXTURE9);
    // saturn's rings
    var saturnRing = document.getElementById("ring");
    saturnRingTex = configureTexture(saturnRing, gl.TEXTURE10);


    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);


    // y-level camera slider
    const ySlider = document.getElementById("ySlider");
    ySlider.addEventListener("input", function() {
        const y = this.value;
        console.log(y);
        eye = vec3(eye[0], y, eye[2]);
    });

    // x-level camera slider
    const xSlider = document.getElementById("xSlider");
    xSlider.addEventListener("input", function() {
        const x = this.value;
        console.log(x);
        eye = vec3(x, eye[1], eye[2]);
    });

    // z-level camera slider
    const zSlider = document.getElementById("zSlider");
    zSlider.addEventListener("input", function() {
        const z = this.value;
        console.log(z);
        eye = vec3(eye[0], eye[1], z);
    });

    // enabl/disable orbit paths
    const orbitBtn = document.getElementById("orbitBtn");
    orbitBtn.addEventListener("click", function() {
        orbit_flag = !orbit_flag;
        if (orbit_flag) {
            orbitBtn.textContent = "Disable Paths";
        } else {
            orbitBtn.textContent = "Enable Paths";
        }
    });



    var interval = null;


    render();
}




var render = function() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let time = performance.now() / 1000;

    // camera
    // update modelView matrix based on eye position
    modelViewMatrix = lookAt(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    // gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Set sun position as light source
    gl.uniform3fv(uLightPositionLoc, flatten(vec3(0.0, 0.0, 0.0)));

    // draw starfield - environment
    gl.depthMask(false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, starfieldTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(eye[0], eye[1], eye[2], 500.0, 0.0, true, false);
    gl.depthMask(true);

    gl.uniform1i(uIsBackgroundLoc, 0);

    // draw all the orbit paths
    if(orbit_flag) {
        gl.uniform1i(uIsSunLoc, 0);
        gl.uniform1i(uIsLineLoc, 1); // no lighting
        for (var i = 0; i < orbitPaths.length; i++) {
            drawOrbitPath(i);
        }
        gl.uniform1i(uIsLineLoc, 0); // normal lighting
    }
    
    
    // draw mercury
    let mercuryX = 13.9 * Math.cos(time * 2.8);
    let mercuryZ = 13.9 * Math.sin(time * 2.8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mercuryTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(mercuryX, 0.0, mercuryZ, 0.4, time * 100, false, false);


    // draw venus
    let venusX = 17.2 * Math.cos(time * 1.15);
    let venusZ = 17.2 * Math.sin(time * 1.15);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, venusTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(venusX, 0.0, venusZ, 0.9, time * 30, false, false);

    // draw sun
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sunTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(0.0, 0.0, 0.0, 10.0, time * 10, true, false);

    // draw earth
    let earthX = 20.0 * Math.cos(time * 0.7);
    let earthZ = 20.0 * Math.sin(time * 0.7);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(earthX, 0.0, earthZ, 1.0, time * 50, false, false);

    // draw mars
    let marsX = 25.2 * Math.cos(time * .4);
    let marsZ = 25.2 * Math.sin(time * .4);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, marsTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(marsX, 0.0, marsZ, 0.7, time * 50, false, false);

    // draw jupiter
    let jupiterX = 32.0 * Math.cos(time * 0.06);
    let jupiterZ = 32.0 * Math.sin(time * 0.06);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, jupiterTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(jupiterX, 0.0, jupiterZ, 4.0, time * 60, false, false);

    // draw saturn
    let saturnX = 45.4 * Math.cos(time * 0.03);
    let saturnZ = 45.4 * Math.sin(time * 0.03);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, saturnTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(saturnX, 0.0, saturnZ, 3.7, time * 60, false, false);

    // draw saturn's rings
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, saturnRingTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    gl.uniform1i(uIsBackgroundLoc, 0);
    drawRing(saturnX, 0.0, saturnZ, 3.7, time * 60);

    // draw uranus
    let uranusX = 62.0 * Math.cos(time * 0.008);
    let uranusZ = 62.0 * Math.sin(time * 0.008);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uranusTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(uranusX, 0.0, uranusZ, 2.0, time * 70, false, true);

    // draw neptune
    let neptuneX = 80.0 * Math.cos(time * 0.004);
    let neptuneZ = 80.0 * Math.sin(time * 0.004);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, neptuneTex);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
    drawPlanet(neptuneX, 0.0, neptuneZ, 2.0, time * 80, false, false);


    requestAnimationFrame(render);
}