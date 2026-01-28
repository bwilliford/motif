//Initialize DOM elements we'll manipulate
let chalkboard = document.getElementById('sketchCanvas');
//let toggleBG = document.getElementById('toggleBackground');
let toolbar = document.getElementById('toolbar');
let mainColor = "#fc6238";

//Global variables / tools
let sketch = [];
let path;
let chalk;
let eraser;
let strokeColor = mainColor;
let strokeSize = 2;
let chalkActivated = 0;

let initialX;
let initialY;
let finalX;
let finalY;

let undoneSketches = [];
let shiftPressed = false;

//Initialization of PaperJS and attaching to canvas
paper.install(window);
function initializePaper() { 
// Create an empty project and a view for the canvas
    paper.setup(chalkboard);
    //Activate chalk by default
    chalkActivated = 1;

    //Chalk tool
    chalk = new Tool();
    chalk.onMouseDown = function(event) {
        path = new paper.Path();
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;
        path.add(event.point);
    }
    chalk.onMouseDrag = function(event) {
        path.add(event.point);
    }
    chalk.onMouseUp = function(event) {
        path.simplify();
    }

    //Smart shape tool
    smartShape = new Tool();
    smartShape.onMouseDown = function(event) {
        path = new paper.Path();
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;
        path.add(event.point);
    }
    smartShape.onMouseDrag = function(event) {
        path.add(event.point);
    }
    smartShape.onMouseUp = function(event) {
        path.simplify();

        //Recognition tests / features
        //Is it a closed shape? (Returns true or false)
        let lineRatio = isLine(path); 
        //Is it a closed shape? (Returns true or false)
        let closedShape = isClosedShape(path); 
        //Returns top left point of bounding box
        let topLeftPoint = getTopLeftPoint(path);
        //Returns bottom right point of bounding box
        let bottomRightPoint = getBottomRightPoint(path);
        //Returns # of corners in stroke
        let corners = getCorners(path);


        //Is it a line?
        if (lineRatio > 0.98) {
            firstPoint = path.segments[0].point;
            lastPoint = path.segments[path.segments.length-1].point;
            path.remove();
            path = new paper.Path(firstPoint,lastPoint);
        }
        //Is it a circle?
        if (closedShape && corners <= 2) {
            path.remove();
            rect = new paper.Rectangle(topLeftPoint, bottomRightPoint);
            path = new paper.Path.Ellipse(rect);
        }
        //Is it a square?
        else if (closedShape && corners > 2 && corners < 5) {
            path.remove();
            path = new paper.Path.Rectangle(topLeftPoint, bottomRightPoint);
        }
        //Is it an arrow?
        else {
            arrowTest(path, lineRatio);
        }
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;

        if (strokeColor === 'white' || strokeColor === 'black') {
            sketch.push(path);
        }
    }

    //Rectilinear tool
    rectilinear = new Tool();
    rectilinear.onMouseDown = function(event) {
        path = new paper.Path();
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;
        path.add(event.point);
    }
    rectilinear.onMouseDrag = function(event) {
        path.add(event.point);
    }
    rectilinear.onMouseUp = function(event) {
        path.simplify();

        //Recognition tests / features
        //Is it a closed shape? (Returns true or false)
        let lineRatio = isLine(path); 
        //Is it a closed shape? (Returns true or false)
        let closedShape = isClosedShape(path); 
        //Returns top left point of bounding box
        let topLeftPoint = getTopLeftPoint(path);
        //Returns bottom right point of bounding box
        let bottomRightPoint = getBottomRightPoint(path);
        //Returns # of corners in stroke
        let corners = getCorners(path);

        //Is it a square?
        if (closedShape && corners > 2 && corners < 5) {
            path.remove();
            path = new paper.Path.Rectangle(topLeftPoint, bottomRightPoint);
        }
        else {
            let firstPoint = path.segments[0].point;
            let lastPoint = path.segments[path.segments.length-1].point;
            let lineType = 'horizontal';
            
            //Determine if vertical line or horizontal line
            //Compute x and y distances
            let xDistance = Math.abs(firstPoint.x - lastPoint.x);
            let yDistance = Math.abs(firstPoint.y - lastPoint.y);

            //Determine if vertical line or horizontal line
            if (xDistance > yDistance) {
                //Horizontal line
                lastPoint.y = firstPoint.y;
                lineType = 'horizontal';
            }
            else {
                //Vertical line
                lastPoint.x = firstPoint.x;
                lineType = 'vertical';
            }    
 
            //Make the simplified stroke
            path.remove();
            path = new paper.Path(firstPoint,lastPoint);
        }
        //Is it a square?
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;

        if (strokeColor === 'white' || strokeColor === 'black') {
            sketch.push(path);
        }
    }

    //Line shape tool
    line = new Tool();
    line.onMouseDown = function(event) {
        path = new paper.Path();
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;
        if (sketch.length > 0 && event.event.shiftKey) {
            lastPath = sketch[sketch.length-1];
            path.add(lastPath.segments[lastPath.segments.length-1].point);
            path.add(event.point);
        }
        else {
            path.add(event.point);
            path.add(event.point);
        }
        
    }
    line.onMouseDrag = function(event) {
        path.segments[1].point = event.point;
    }
    line.onMouseUp = function(event) {
        if (strokeColor === 'white' || strokeColor === 'black') {
            sketch.push(path);
        }
    }

    //Circle shape tool
    circle = new Tool();
    circle.onMouseDown = function(event) {
        path = new paper.Path();
        initialX = event.point.x;
        initialY = event.point.y;
    }
    circle.onMouseDrag = function(event) {
        path.remove();

        finalX = event.point.x;
        if (event.event.shiftKey) {
            let xDiff = initialX - event.point.x;
            finalY = initialY - xDiff;
            rect =  new paper.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
            path = new paper.Path.Ellipse(rect);
        }
        else {
            finalY = event.point.y;
            rect =  new paper.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
            path = new paper.Path.Ellipse(rect);
        }
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;
    }
    circle.onMouseUp = function(event) {
        path.remove();

        //Is shift key pressed? Constrain to 1:1 proportions based on x
        finalX = event.point.x;
        if (event.event.shiftKey) {
            let xDiff = initialX - event.point.x;
            finalY = initialY - xDiff;
            rect =  new paper.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
            path = new paper.Path.Ellipse(rect);
        }
        else {
            finalY = event.point.y;
            rect =  new paper.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
            path = new paper.Path.Ellipse(rect);
        }
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;

        if (strokeColor === 'white' || strokeColor === 'black') {
            sketch.push(path);
        }
    }

    //Square shape tool
    square = new Tool();
    square.onMouseDown = function(event) {
        path = new paper.Path();
        initialX = event.point.x;
        initialY = event.point.y;
    }
    square.onMouseDrag = function(event) {
        path.remove();
        
        //Is shift key pressed? Constrain to 1:1 proportions based on x
        finalX = event.point.x;
        if (event.event.shiftKey) {
            let xDiff = initialX - event.point.x;
            finalY = initialY - xDiff;
            path = new paper.Path.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
        }
        else {
            finalY = event.point.y;
            path = new paper.Path.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
        }
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;
    }
    square.onMouseUp = function(event) {
        path.remove();
        
        //Is shift key pressed? Constrain to 1:1 proportions based on x
        finalX = event.point.x;
        if (event.event.shiftKey) {
            let xDiff = initialX - event.point.x;
            finalY = initialY - xDiff;
            path = new paper.Path.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
        }
        else {
            finalY = event.point.y;
            path = new paper.Path.Rectangle(new Point(initialX, initialY), new Point(finalX, finalY));
        }
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeSize;

        if (strokeColor === 'white' || strokeColor === 'black') {
            sketch.push(path);
        }
    }

    //Text tool
    textInput = new Tool();
    textInput.onMouseUp = function(event) {
        let x = event.point.x - 20;
        let y = event.point.y - 20;
        let input = document.createElement("input");
        input.type = "text";
        input.className = "text";
        input.style.top = y+"px";
        input.style.left = x+"px";
        input.style.color = strokeColor;
        document.getElementById('textContainer').appendChild(input);
        input.focus();
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        });
        // Add placeholder text via attribute
        input.setAttribute("placeholder", "Enter text...");
        
    }

    //Eraser tool
    eraser = new paper.Tool();
    eraser.onMouseDown = erase;
    eraser.onMouseDrag = erase;
    function erase(event) {
        //dataChanged = true;
        let hits = paper.project.hitTestAll(event.point, {
            segments: true,
            fill: true,
            class: paper.Path,
            tolerance: 5,
            stroke: true
        });

        if (hits.length) {
            for (var i = 0; i < hits.length; i++) {
                let hit = hits[i];
                hit.item.remove();            
            }
        }

        // Also remove DOM text inputs under the pointer.
        if (event.event && typeof document.elementsFromPoint === 'function') {
            const elements = document.elementsFromPoint(event.event.clientX, event.event.clientY);
            elements
                .filter((el) => el.classList && el.classList.contains('text'))
                .forEach((el) => el.remove());
        }
    }

    rectilinear.activate();
}

// Initialize after DOM is ready so the canvas exists.
window.addEventListener('load', initializePaper);

//Recognition functions
function isLine(path) {
    let firstLastDistance = path.segments[0].point.getDistance(path.segments[path.segments.length-1].point);
    let ratio = firstLastDistance / path.length;
    return ratio;
}

function isClosedShape(path) {
    let threshold = paper.view.size.width / 50;
    
    let distance = path.segments[0].point.getDistance(path.segments[path.segments.length-1].point) 

    if (distance < threshold) {
        return true;
    } 
    else {
        return false;
    }
}

function getTopLeftPoint(path) {
    lowestX = 9999;
    lowestY = 9999;
    for (let i = 0; i < path.segments.length; i++) {
        if (path.segments[i].point.x < lowestX) {
            lowestX = path.segments[i].point.x;
        }
        if (path.segments[i].point.y < lowestY) {
            lowestY = path.segments[i].point.y;
        }
    }
    let point = new paper.Point(lowestX, lowestY);
    return point;
}

function getBottomRightPoint(path) {
    highestX = 0;
    highestY = 0;
    for (let i = 0; i < path.segments.length; i++) {
        if (path.segments[i].point.x > highestX) {
            highestX = path.segments[i].point.x;
        }
        if (path.segments[i].point.y > highestY) {
            highestY = path.segments[i].point.y;
        }
    }
    let point = new paper.Point(highestX, highestY);
    return point;
}

//ShortStraw Corner Detection Algorithm from Sketch Recognition Lab (Texas A&M University)
//https://diglib.eg.org/bitstream/handle/10.2312/SBM.SBM08.033-040/033-040.pdf?sequence=1&isAllowed=y
function getCorners(path) {
    let x = [];
	let y = [];

	let Sx = [];
	let Sy = [];
	let St = [];

	let D = 0;
	let straws = [];
    let corners = 0;

	let totalStraw = 0;
	let w = 3;
	let deltaTime = [];
    let subStrokes = [];

	// Get x,y,t values for stroke
	for (let i = 0; i < path.length; i++) {
		point = path.getPointAt(i);
		x.push(point.x);
		y.push(point.y);
	}

	// Determine S (resampled distance) using Rubine F3 (Length of Bounding Box Diaganol)
	function getMaxOfArray(numArray) {
		return Math.max.apply(null, numArray);
	}
	function getMinOfArray(numArray) {
		return Math.min.apply(null, numArray);
	}
	let xmax = getMaxOfArray(x);
	let xmin = getMinOfArray(x);
	let ymax = getMaxOfArray(y);
	let ymin = getMinOfArray(y);
	let Diag = Math.sqrt(((xmax - xmin)*(xmax - xmin))+((ymax - ymin)*(ymax - ymin)));
	let S = Math.round(Diag / 40);


	// Resample the stroke based on S
	for (i=1; i < x.length; i++) {
        let xdist = Math.abs( x[i] - x[i-1]);
        let ydist = Math.abs( y[i] - y[i-1]);
        let dist = Math.sqrt((xdist*xdist) + (ydist*ydist));
        D = D + dist;
        if (D > S) {
            let ratio = (1 - ((D - S) / dist)); // Ratio between point j-1 and j to create the respaced point
            let newX = ratio * (x[i] - x[i-1]) + x[i-1]; // Ratio from j-1 point to j point * x difference + x initial (x[j-1])
            let newY = ratio * (y[i] - y[i-1]) + y[i-1]; // Ratio from j-1 point to j point * y difference + y initial (y[j-1])
      
            Sx.push(newX);
            Sy.push(newY);

            let newXDist = Math.abs( x[i] - newX);
            let newYDist = Math.abs( y[i] - newY);
            D = Math.sqrt((newXDist*newXDist) + (newYDist*newYDist));

            // let dot = new paper.Path.Circle(new paper.Point(newX, newY), 8);
            // dot.fillColor = 'blue';
        }
	}

	// Compute Straws!
	for (i=w; i < Sx.length - w; i++) {
		let strawStart = new Point(Sx[i-w], Sy[i-w]);
		let strawEnd = new Point(Sx[i+w], Sy[i+w]);
		let newStraw = new Path.Line(strawStart, strawEnd);
		let newStrawLength = newStraw.length
		straws.push(newStrawLength);
	}

	// Find median straw length
	let sortedStraw = straws.slice(0);
	let strawMed = getMedian(sortedStraw);

	function getMedian(values) {
		values.sort( function(a,b) {return a - b;} );

		let half = Math.floor(values.length/2);

		if(values.length % 2)
			return values[half];
		else
			return (values[half-1] + values[half]) / 2.0; result;
	}

	// Set threshold
	let threshold = strawMed * 0.95;

	// Consider time to reduce false positives
	// Find average deltatime

	//for (i=0; i < St.length; i++) {
	//	deltaTime.push(St[i+1] - St[i]);;
	//}
	//var totalDeltaTime = deltaTime[10] - deltaTime[0];
	//var avgDeltaTime = totalDeltaTime / deltaTime.length;

	//var timeThreshold = 0.9;
	// Find point candidates

    // var corner = new paper.Path.Circle(new paper.Point(Sx[0], Sy[0]), 8);
    // corner.fillColor = 'red';
    corners++;

	for (i = w; i < Sx.length - w; i++) {

		if (straws[i] < threshold) {

				var localMin = 10000;
				var localMinIndex = i;
				while (i < straws.length && straws[i] < threshold) {

					if (straws[i] < localMin) {
						localMin = straws[i];
						localMinIndex = i;
					}
					i++;
				}

            // Split stroke
            //path.segments[i].
            //subStrokes.push()
            //(subStrokes);
            // var corner = new paper.Path.Circle(new paper.Point(Sx[i], Sy[i]), 8);
            // corner.fillColor = 'red';
            corners++;


			//}
		}
	}
    return corners;
}

//Tahuti Arrow Recognizer by Tracy Hammond, MIT
function arrowTest(path, lineRatio) {
    let A = 0;
    let B = 0;
    let C = 0;
    let D = 0;
    let distanceFar = 0;
    let x = [];
    let y = [];
    //Find shaft
    //Find farthest other point
    for (let j = 0; j < path.length; j++) {
        point = path.getPointAt(j);
        x.push(point.x);
        y.push(point.y);
    }

    //A is origin point
    A = new paper.Point(x[0],y[0]);
    // var text = new PointText(A);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'A';		
    
    for (i = 0; i < x.length; i++) {
        var distance = Math.sqrt((x[i]-x[0])*(x[i]-x[0]) + (y[i]-y[0])*(y[i]-y[0])); 
        if (distance > distanceFar) {
            distanceFar = distance;
            //Found B - farthest other point
            B = new paper.Point(x[i], y[i])
        }
    }
    var text = new PointText(B);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'B';		
    
    //We have AB now 
    var AB = new paper.Path(A, B);
    // AB.strokeColor = 'blue';
    // AB.strokeWidth = 1;

    //Make E which is 3/4 length 
    var offset = AB.length*0.75;

    var Epoint = AB.getPointAt(offset);
    var E = new paper.Point(Epoint);
    // var text = new PointText(E);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'E';		

    var normal = path.getNormalAt(offset).multiply(AB.length*0.3);

    //Find C and D
    var cCheck = new paper.Point(E.add(normal));
    // var text = new PointText(cCheck);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'c';	

    var dCheck = new paper.Point(E.subtract(normal));
    // var text = new PointText(dCheck);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'd';	

    C = path.getNearestPoint(cCheck);
    // var text = new PointText(C);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'C';	

    D = path.getNearestPoint(dCheck);
    // var text = new PointText(D);
    // text.justification = 'center';
    // text.fillColor = 'blue';
    // text.content = 'D';	

    //We have BC now 
    var BC = new paper.Path(B, C);
    // BC.strokeColor = 'blue';
    // BC.strokeWidth = 1;

    //We have BD now 
    var BD = new paper.Path(B, D);
    // BD.strokeColor = 'blue';
    // BD.strokeWidth = 1;

    //We have CD now 
    var CD = new paper.Path(C, D);
    //CD.strokeColor = 'blue';
    //CD.strokeWidth = 1;

    //We have CE now 
    var CE = new paper.Path(C, E);
    //CE.strokeColor = 'blue';
    //CE.strokeWidth = 1;

    //We have DE now 
    var DE = new paper.Path(D, E);
    //DE.strokeColor = 'blue';
    //DE.strokeWidth = 1;
            
    var headRatio = BC.length / BD.length;
    var idealLength = AB.length*0.4;
    var lowestLength = AB.length*0.02;
    //console.log(headRatio, idealLength, lowestLength);
    
    if ((idealLength > BC.length && BC.length > lowestLength)  
        && (idealLength > BD.length && BD.length > lowestLength)  
        && (idealLength > CD.length && CD.length > lowestLength*1.5) 
        && (AB.length > (path.length*0.4)) 
        && (DE.length > lowestLength) 
        && (CE.length > lowestLength) 
        && (headRatio > 0.5) 
        && (headRatio < 1.5)
        && (lineRatio < 0.8)
        ) {
            path.remove();
            
            //Add beautified arrow
            arrowShaft = new paper.Path(A,B);
            arrowHeadA = new paper.Path(B,C);
            arrowHeadB = new paper.Path(B,D);
            arrowShaft.strokeColor = strokeColor;
            arrowShaft.strokeWidth = strokeSize;
            arrowHeadA.strokeColor = strokeColor;
            arrowHeadA.strokeWidth = strokeSize;
            arrowHeadB.strokeColor = strokeColor;
            arrowHeadB.strokeWidth = strokeSize;

            if (strokeColor === 'white' || strokeColor === 'black') {
                sketch.push(arrowShaft);
                sketch.push(arrowHeadA);
                sketch.push(arrowHeadB);
            }
    }	
}


//Main functions

//Clear canvas 
function clearChalkboard() {
    paper.project.activeLayer.removeChildren();
    document.getElementById('textContainer').innerHTML = "";
}

//Toggle background from chalkboard to whiteboard and vice-versa
function toggleBackground(bg) {
    if (bg === 'night' && chalkboard.classList.contains("chalkboard")) {
        chalkboard.classList.toggle("chalkboard");
        chalkboard.classList.toggle("whiteboard");

        mainColor.style.backgroundColor = "#000000";
        toggleStrokeColors('black');
        strokeColor = 'black';

        document.getElementById('dayMode').className = 'active';
        document.getElementById('nightMode').className = '';
    }
    else if (bg === 'day' && chalkboard.classList.contains("whiteboard")) {
        chalkboard.classList.toggle("chalkboard");
        chalkboard.classList.toggle("whiteboard");

        mainColor.style.backgroundColor = "#ffffff";
        toggleStrokeColors('white');
        strokeColor = 'white';

        document.getElementById('dayMode').className = '';
        document.getElementById('nightMode').className = 'active';
    }
}

//Ensure black and white sketches also invert
function toggleStrokeColors(color) {
    for (let i = 0; i < sketch.length; i++) {
        //Only change for black or white strokes
            sketch[i].strokeColor = color;
            strokeColor = color;
    }
}

//Change tools
function changeTool(tool) {
    let tools = ['freehand','line','rectilinear','square','smart','circle','eraser', 'text', 'clear'];
    for (let i = 0; i < tools.length; i++) {
        document.getElementById(tools[i]).className = "";
    }

    //Change cursor
    if (tool === 'eraser') {
        document.getElementById('sketchCanvas').style.cursor = "url('./images/icons/erase.svg') 0 32, pointer";
    }
    else {
        document.getElementById('sketchCanvas').style.cursor = 'crosshair';
    }

    // Activate tool
    if (tool === 'freehand') {
        chalk.activate();
        document.getElementById('freehand').className = "active";
    }
    if (tool === 'text') {
        textInput.activate();
        document.getElementById('text').className = "active";
    }
    else if (tool === 'line') {
        line.activate();
        document.getElementById('line').className = "active";
    }
    else if (tool === 'square') {
        square.activate();
        document.getElementById('square').className = "active";
    }
    else if (tool === 'circle') {
        circle.activate();
        document.getElementById('circle').className = "active";
    }
    else if (tool === 'eraser') {
        eraser.activate();
        document.getElementById('eraser').className = "active";
    }
    else if (tool === 'smartShape') {
        smartShape.activate();
        document.getElementById('smallPanel').className = "active";
    }

    document.getElementById(tool).className = "active";
}

//Change colors
function changeColor(color) {
    //Reset active classes
    let colors = ['mainColor','red','blue','green','purple','orange'];
    for (let i = 0; i < colors.length; i++) {
        document.getElementById(colors[i]).className = "";
    }

    //Change color
    document.getElementById(color).className = "active";
    if (color === 'mainColor') {
        if (chalkboard.classList.contains('chalkboard')) {
            strokeColor = 'white';
            document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursor.svg') 0 32, pointer";
        }
        else {
            strokeColor = 'black';
            document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursor.svg') 0 32, pointer";
        }
    }
    else if (color === 'red') {
        strokeColor = '#df5959'; 
        document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursorRed.svg') 0 32, pointer";
    }
    else if (color === 'blue') {
        strokeColor = '#678fe0'; 
        document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursorBlue.svg') 0 32, pointer";
    }
    else if (color === 'green') {
        strokeColor = '#86d0ca';
        document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursorGreen.svg') 0 32, pointer"; 
    }
    else if (color === 'purple') {
        strokeColor = '#9e7ad9'; 
        document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursorPurple.svg') 0 32, pointer";
    }
    else if (color === 'orange') {
        strokeColor = '#d69e54'; 
        document.getElementById('chalkboard').style.cursor = "url('./images/icons/sketchCursorOrange.svg') 0 32, pointer";
    }
}

function changeTemplate() {
    template = document.getElementById("templateSelect").value;
    document.getElementById('chalkboard').className = 'chalkboard '+template; 
}

function toggleTemplate(template) {
    //Reset templates
    if (document.getElementById(template).className === 'active') {
        document.getElementById('chalkboard').classList.toggle(template);
        document.getElementById(template).className = '';
    }
    else {
        let templates = ['gridSmall','gridLarge','dotsSmall','dotsLarge','lines','worldMap','usMap','europeMap','asiaMap','sheetMusic','tabGuitar','periodicTable','vennDiagram'];
        for (let i = 0; i < templates.length; i++) {
            document.getElementById(templates[i]).className = '';
            if (document.getElementById('chalkboard').classList.contains('chalkboard')) {
                document.getElementById('chalkboard').className = 'chalkboard';
            }
            else {
                document.getElementById('chalkboard').className = 'whiteboard';
            }
        }
        
        document.getElementById('chalkboard').classList.toggle(template);
        document.getElementById(template).classList.toggle('active');
        toggleTemplateMenu();
    }
}

function toggleTemplateMenu() {
    document.getElementById('templateMenu').classList.toggle('active');
}

function toggleTemplateCategory(category) {
    let categories = ['Math', 'Language', 'Geography', 'Science', 'Music','Business'];
    for (let i = 0; i < categories.length; i++) {
        document.getElementById(categories[i]+'Category').className = '';
        document.getElementById(categories[i]).style.display = 'none';
    }
    
    document.getElementById(category+'Category').className = 'active' 
    document.getElementById(category).style.display = 'block';
}

function undo() {
    undoneSketches.push(sketch[sketch.length-1]);
    sketch[sketch.length-1].remove();
    sketch.splice(sketch.length-1,1);
}

function redo() {
    sketch.push(undoneSketches[undoneSketches.length-1]);
    undoneSketches[undoneSketches.length-1].remove();
    undoneSketches.splice(undoneSketches.length-1,1);
}

document.onkeydown = function (e) {
    if (e.shiftKey) {
        shiftPressed = true;
    }
    else {
        shiftPressed = false;
    }
};


//Saving sketch
function saveChalkboard() {
    let canvas = document.getElementById("chalkboard");
    let dataURL = canvas.toDataURL({format: 'png', multiplier: 4})
    download("image.png", dataURL)

}
// must be called in a click handler or some other user action
let download = function(filename, dataUrl) {
    let element = document.createElement('a')

    let dataBlob = dataURLtoBlob(dataUrl)
    element.setAttribute('href', URL.createObjectURL(dataBlob))
    element.setAttribute('download', filename)

    element.style.display = 'none'
    document.body.appendChild(element)

    element.click()

    let clickHandler;
    element.addEventListener('click', clickHandler=function() {
        // ..and to wait a frame
        requestAnimationFrame(function() {
            URL.revokeObjectURL(element.href);
        })

        element.removeAttribute('href')
        element.removeEventListener('click', clickHandler)
    })

    document.body.removeChild(element)
}
// from Abhinav's answer at  https://stackoverflow.com/questions/37135417/download-canvas-as-png-in-fabric-js-giving-network-error/
// let dataURLtoBlob = function(dataurl) {
//     let parts = dataurl.split(','), mime = parts[0].match(/:(.*?);/)[1]
//     if(parts[0].indexOf('base64') !== -1) {
//         let bstr = atob(parts[1]), n = bstr.length, u8arr = new Uint8Array(n)
//         while(n--){
//             u8arr[n] = bstr.charCodeAt(n)
//         }

//         return new Blob([u8arr], {type:mime})
//     } else {
//         let raw = decodeURIComponent(parts[1])
//         return new Blob([raw], {type: mime})
//     }
// }