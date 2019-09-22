// init

var canvas
var c
var miniMap
var m

var pi = Math.PI
var figures = 10

var thetaStep

// rendering

var fov = 75/360*2*pi
var maxDistance = 9
var minDistance = 1/10
var height = 1 //array units
var wallColor = {
	red: 0xa5,
	green: 0x2a,
	blue: 0x2a
}
var ceilingColor = {
	top: "darkblue",
	bottom: "lightblue"
}
var floorColor = {
	top: "darkgreen",
	bottom: "green"
}

// map

var map1 = [
	[1,1,1,1,1,1,1,1],
	[1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1],
	[1,1,1,0,0,1,1,1],
	[1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1],
	[1,1,1,1,1,1,1,1]
]

var map2 = [
	[1,1,1,1,1],
	[1,0,0,0,1],
	[1,1,1,0,1],
	[1,0,0,0,1],
	[1,1,1,1,1]
]

var currentMap = map1

// player

var player = {
	x: 1.5,
	y: 1.5,
	theta: 0
}
player.thetaLower = function() {
	return player.theta - fov/2
}
player.thetaUpper = function() {
	return player.theta + fov/2
}

var rotateStep = pi/64
var keys = []
var moveFactor = 1/16
var interval = 20

//event handlers

window.onload = function() {
	canvas = document.getElementById("canvas")
	c = canvas.getContext("2d")
	
	thetaStep = fov/canvas.width
	miniMap = document.getElementById("miniMap")
	m = miniMap.getContext("2d")
	refresh()
}

window.onkeydown = function(e) {
	if ( keys[e.which] === undefined ) {
		switch (e.which) {
			case 87: //up
				keys[e.which] = setInterval( moveForward, interval )
				break
			case 83: //down
				keys[e.which] = setInterval( moveBackwards, interval )
				break
			case 65: //left
				keys[e.which] = setInterval( rotateCW, interval )
				break
			case 68: //right
				keys[e.which] = setInterval( rotateCCW, interval )
				break 
		}
	}
}

window.onkeyup = function(e) {
	if ( keys[e.which] !== undefined ) {
		clearInterval( keys[e.which] )
		keys[e.which] = undefined
	}
}

// functions

// core

Math.ceil2 = function(value) {
	var buffer = Math.ceil(value)
	if ( buffer === value ) {
		return buffer + 1
	}
	else {
		return buffer
	}
}

Math.floor2 = function(value) {
	var buffer = Math.floor(value)
	if ( value === buffer ) {		
		return Math.floor(value) - 1
	}
	else {
		return buffer
	}
}

function modulus(theta) {
	if ( theta >= 2*pi ) {
		return theta % (2*pi)
	}
	if (theta<0 ) {
		return (theta + 2*pi) % (2*pi)
	}
	else {
		return theta
	}
}

function getQuadrant(theta) {
	if ( theta>=2*pi && modulus(theta)===0 ) {
		// Math.sin(2*pi) returns < 0, so y--
		return 4
	}
	theta = modulus(theta)
	if ( 0<=theta && theta<=pi/2 ) {
		// Math.cos(pi/2) = +0, so x++ 
		return 1
	}
	if ( pi/2<=theta && theta<=pi ) {
		// Math.sin(pi) returns > 0, so y++
		return 2
	}
	if ( pi<=theta && theta<=3/2*pi ) {
		// Math.cos(3/2*pi) returns < 0, so x--
		return 3
	}
	if ( 3/2*pi<theta && theta<2*pi ) {
		return 4
	}
	else {
		throw Error( "Could not get quadrant for "+theta )
	}
}

// rendering

function renderMap() {
	c.clearRect(0, 0, canvas.width, canvas.height)
	drawCeiling()
	drawFloor()
	for (var x=0; x<=canvas.width; x++) {
		var hTheta = modulus(player.thetaLower() + x*thetaStep)
		var d = calculateDistance(hTheta)
		var amp = d/Math.cos(fov)
		//amp*cos(fov) = d; where upper ray in vertical fov intersects horizontal distance
		var lineHeight = canvas.height / d * height
		var verticalOffset = ( canvas.height - lineHeight ) / 2
		c.beginPath()
		c.moveTo(x+0.5, verticalOffset)
		c.lineTo(x+0.5, verticalOffset+lineHeight)
		var factor = 1-d/maxDistance
		c.strokeStyle = 
			"rgb("
			+ Math.round(wallColor.red*factor)
			+ ","
			+ Math.round(wallColor.green*factor)
			+ ","
			+ Math.round(wallColor.blue*factor)
			+ ")"
		c.stroke()
		c.closePath()
	}
}

function getTileCoordinates(theta, amp) {
	switch ( getQuadrant(theta) ) {
		case 1:
			return {
				x: Math.floor( amp*Math.cos(theta) + player.x ),
				y: Math.floor( amp*Math.sin(theta) + player.y )
			}
		case 2:
			var x = amp*Math.cos(theta) + player.x
			if ( parseInt(x)===x ) {
				x -= 1
			}
			else {
				x = Math.floor(x)
			}
			return {
				x: x,
				y: Math.floor( amp*Math.sin(theta) + player.y )
			}
		case 3:
			var xBuffer = amp*Math.cos(theta) + player.x
			var yBuffer = amp*Math.sin(theta) + player.y
			var x = Math.floor(xBuffer)
			var y = Math.floor(yBuffer)
			if ( parseInt(xBuffer)===xBuffer ) {
				x = xBuffer - 1
			}
			if ( parseInt(yBuffer)===yBuffer ) {
				y = yBuffer - 1
			}
			return {x:x, y:y}
		case 4:
			var y = amp*Math.sin(theta) + player.y
			if ( parseInt(y)===y ) {
				y -= 1
			}
			else {
				y = Math.floor(y)
			}
			return {
				x: Math.floor( amp*Math.cos(theta) + player.x ),
				y: y
			}
	}
}

function calculateDistance(theta) {
	for (var amp=0; Math.abs(amp)<maxDistance; ) {
		var oldAmp = amp
		amp += Math.min( getAmpX(theta, amp), getAmpY(theta, amp) )
		var newAmp = amp
		if ( oldAmp===newAmp ) {
			throw Error("infinite loop at "+player.x+", "+player.x+", "+theta)
		}
		var co = getTileCoordinates(theta, amp)
		if ( currentMap[co.y] ) {
			if (currentMap[co.y][co.x]) {
				return amp
			}
		}
	}
	return maxDistance
}

function dda(theta) {
	c.clearRect(0, 0, canvas.width, canvas.height)
	// draw map
	tileSize = 50
	c.fillStyle = "black"
	c.strokeStyle = "black"
	for (var y=0; y<currentMap.length; y++) {
		for (var x=0; x<currentMap[y].length; x++ ) {
			if ( currentMap[y][x] ) {
				c.fillRect(x*tileSize+0.5, y*tileSize+0.5, tileSize+0.5, tileSize+0.5)
			}
			else {
				c.strokeRect(x*tileSize+0.5, y*tileSize+0.5, tileSize, tileSize)
			}
		}
	}
	// highlight tiles
	for (var amp=0; amp<maxDistance; ) {
		var oldAmp = amp
		amp += Math.min(getAmpX(theta, amp), getAmpY(theta, amp)) // increment amp positively by smaller amplitude
		var newAmp = amp
		if ( oldAmp===newAmp ) {
			throw Error("infinite loop at "+player.x+", "+player.x+", "+theta)
		}
		var co = getTileCoordinates(theta, amp)
		if ( currentMap[co.y] ) {
			if (currentMap[co.y][co.x]) {
				c.fillStyle = "red"
			}
			else {
				c.fillStyle = "gray"
			}
		}
		else {
			break
		}
		c.fillRect(co.x*tileSize, co.y*tileSize, tileSize, tileSize)
	}
	// draw angled line
	c.strokeStyle = "green"
	c.beginPath()
	c.moveTo(player.x*tileSize, player.y*tileSize)
	c.lineTo(
		tileSize*maxDistance*Math.cos(theta) + tileSize*player.x,
		tileSize*maxDistance*Math.sin(theta) + tileSize*player.y
	)
	c.stroke()
	c.closePath()
}

function refresh() {
	renderMap()
	//dda(player.theta)
	renderMiniMap()
}

function getAmpX(theta, amp) { // amplitude to get to next x
	var currentX = player.x + amp*Math.cos(theta)
	if ( getQuadrant(theta)===1 || getQuadrant(theta)===4 ) { // I, IV -- x++
		var amp = ( Math.ceil2(currentX)-currentX ) / Math.cos(theta)
	}
	else { // II, III -- x--
		var amp = ( Math.floor2(currentX)-currentX ) / Math.cos(theta)
	}
	checkAmp(amp)
	return amp
}

function getAmpY(theta, amp) { // amplitude to get to next y
	var currentY = player.y + amp*Math.sin(theta)
	if ( getQuadrant(theta)===1 || getQuadrant(theta)===2 ) { // I, II -- y++
		var amp = ( Math.ceil2(currentY)-currentY ) / Math.sin(theta)
	}
	else { // III, IV -- y--
		var amp = ( Math.floor2(currentY)-currentY ) / Math.sin(theta)
	}
	checkAmp(amp)
	return amp
}

function checkAmp(amp) {
	if (amp<0) {
		throw Error("Amplitude less than zero")
	}
}

function drawFloor() {	
	var gradient = c.createLinearGradient(0, canvas.height/2, 0, canvas.height)
	gradient.addColorStop(0, floorColor.top)
	gradient.addColorStop(1, floorColor.bottom)
	c.beginPath()
	c.rect(0, canvas.height/2, canvas.width, canvas.height/2)
	c.fillStyle = gradient
	c.fill()
	c.closePath()
}

function drawCeiling() {
	var gradient = c.createLinearGradient(0, 0, 0, canvas.height/2)
	gradient.addColorStop(0, ceilingColor.top)
	gradient.addColorStop(1, ceilingColor.bottom)
	c.beginPath()
	c.rect(0, 0, canvas.width, canvas.height/2)
	c.fillStyle = gradient
	c.fill()
	c.closePath()
}

// interface

function moveForward() {
	player.x += Math.cos(player.theta) * moveFactor
	player.y += Math.sin(player.theta) * moveFactor
	refresh()
}

function moveBackwards() {
	player.x -= Math.cos(player.theta) * moveFactor
	player.y -= Math.sin(player.theta) * moveFactor
	refresh()
}

function rotateCW() {
	player.theta -= rotateStep
	player.theta = modulus(player.theta)
	refresh()
}

function rotateCCW() {
	player.theta += rotateStep
	player.theta = modulus(player.theta)
	refresh()
}

// minimap

function renderMiniMap() {
	m.clearRect(0, 0, miniMap.width, miniMap.height)
	var tileSize = Math.floor( miniMap.width/currentMap.length )
	//draw blocks
	for(var y=0; y<currentMap.length; y++) {
		for(var x=0; x<currentMap[0].length; x++) {
			if ( currentMap[y][x] ) {
				m.strokeRect(
					x*tileSize + 1/2,
					y*tileSize + 1/2,
					tileSize,
					tileSize
				)
			}
		}
	}
	//draw player
	m.beginPath()
	m.arc(
		player.x*tileSize + 1/2,
		player.y*tileSize + 1/2,
		tileSize/2,
		0,
		2*pi
	)
	m.stroke()
	m.closePath()
	//draw angle
	m.beginPath()
	m.moveTo(
		player.x*tileSize,
		player.y*tileSize
	)
	m.lineTo(
		maxDistance*tileSize*Math.cos(player.theta) + player.x*tileSize,
		maxDistance*tileSize*Math.sin(player.theta) + player.y*tileSize
	)
	m.stroke()
	m.closePath()
	//draw fov
	m.beginPath()
	m.moveTo(
		player.x*tileSize,
		player.y*tileSize
	)
	m.lineTo(
		maxDistance*tileSize*Math.cos(player.theta - fov/2) + player.x*tileSize,
		maxDistance*tileSize*Math.sin(player.theta - fov/2) + player.y*tileSize
	)
	m.moveTo(
		player.x*tileSize,
		player.y*tileSize
	)
	m.lineTo(
		maxDistance*tileSize*Math.cos(player.theta + fov/2) + player.x*tileSize,
		maxDistance*tileSize*Math.sin(player.theta + fov/2) + player.y*tileSize
	)
	m.stroke()
	m.closePath()
}
