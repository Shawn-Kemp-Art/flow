
document.body.innerHTML = '<style>div{color: grey;text-align:center;position:absolute;margin:auto;top:0;right:0;bottom:0;left:0;width:500px;height:100px;}</style><body><div id="loading"><p>This could take a while, please give it at least 5 minutes to render.</p><br><h1 class="spin">⏳</h1><br><h3>Press <strong>?</strong> for shortcut keys</h3><br><p><small>Output contains an embedded blueprint for creating an IRL wall sculpture</small></p></div></body>';

paper.install(window);
window.onload = function() {

document.body.innerHTML = '<style>body {margin: 0px;text-align: center;}</style><canvas resize="true" style="display:block;width:100%;" id="myCanvas"></canvas>';

setquery("fxhash",$fx.hash);
var initialTime = new Date().getTime();

//file name 
var fileName = $fx.hash;

var canvas = document.getElementById("myCanvas");

paper.setup('myCanvas');
paper.activate();

//vvvvvvvvvvvvvvv CLIPPER BOOLEAN ENGINE vvvvvvvvvvvvvvv
var CLIP_SCALE = 100;   // Integer precision for Clipper (100 = 0.01 unit resolution)
var CLIP_FLATTEN = 0.1; // Bezier-to-polygon tolerance (lower = smoother, more points)

function _toClipperPaths(paperItem) {
    var clone = paperItem.clone({ insert: false });
    clone.flatten(CLIP_FLATTEN);
    var children = (clone.className === 'CompoundPath') ? clone.children : [clone];
    var result = [];
    for (var i = 0; i < children.length; i++) {
        var segs = children[i].segments;
        if (segs.length < 3) continue;
        var pts = new Array(segs.length);
        for (var j = 0; j < segs.length; j++) {
            pts[j] = { X: Math.round(segs[j].point.x * CLIP_SCALE),
                       Y: Math.round(segs[j].point.y * CLIP_SCALE) };
        }
        result.push(pts);
    }
    clone.remove();
    return result;
}

function _fromClipperPaths(clipperPaths) {
    if (!clipperPaths || clipperPaths.length === 0) return new Path();
    var compound = new CompoundPath({});
    for (var i = 0; i < clipperPaths.length; i++) {
        var pts = clipperPaths[i];
        if (pts.length < 3) continue;
        var paperPts = new Array(pts.length);
        for (var j = 0; j < pts.length; j++) {
            paperPts[j] = new Point(pts[j].X / CLIP_SCALE, pts[j].Y / CLIP_SCALE);
        }
        compound.addChild(new Path({ segments: paperPts, closed: true, insert: false }));
    }
    // Use non-zero winding — matches Paper.js canvas default and Clipper's output orientation.
    // CleanPolygons removes near-degenerate edges that can cause winding flips at fine tolerances.
    ClipperLib.Clipper.CleanPolygons(clipperPaths, 0.5);
    compound.reorient(true, true);
    return compound;
}

function _clipBool(a, b, clipType) {
    var savedStyle = a.style;
    var clipper = new ClipperLib.Clipper();
    clipper.AddPaths(_toClipperPaths(a), ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(_toClipperPaths(b), ClipperLib.PolyType.ptClip, true);
    var solution = new ClipperLib.Paths();
    clipper.Execute(clipType, solution,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero);
    var result = _fromClipperPaths(solution);
    result.style = savedStyle;
    return result;
}

function clipUnite(a, b)     { return _clipBool(a, b, ClipperLib.ClipType.ctUnion); }
function clipSubtract(a, b)  { return _clipBool(a, b, ClipperLib.ClipType.ctDifference); }
function clipIntersect(a, b) { return _clipBool(a, b, ClipperLib.ClipType.ctIntersection); }
//^^^^^^^^^^^^^ END CLIPPER BOOLEAN ENGINE ^^^^^^^^^^^^^

console.log('hash: '+$fx.hash)
console.log('#'+$fx.iteration)

canvas.style.background = "white";

//Set a seed value for Perlin
var seed = Math.floor($fx.rand()*10000000000000000);

//initialize perlin noise 
var noise = new perlinNoise3d();
noise.noiseSeed(seed);

//read in query strings
var qcolor1 = "AllColors";
if(new URLSearchParams(window.location.search).get('c1')){qcolor1 = new URLSearchParams(window.location.search).get('c1')}; //colors1
var qcolor2 = "None";
if(new URLSearchParams(window.location.search).get('c2')){qcolor2 = new URLSearchParams(window.location.search).get('c2')}; //colors2
var qcolor3 = "None";
if(new URLSearchParams(window.location.search).get('c3')){qcolor3 = new URLSearchParams(window.location.search).get('c3')}; //colors3
var qcolors = R.random_int(1,6);
if(new URLSearchParams(window.location.search).get('c')){qcolors = new URLSearchParams(window.location.search).get('c')}; //number of colors
var qsize = "2";
if(new URLSearchParams(window.location.search).get('s')){qsize = new URLSearchParams(window.location.search).get('s')}; //size
var qflow = R.random_int(2,5);   //number of flow-field cycles across the width
if(new URLSearchParams(window.location.search).get('flow')){qflow = parseInt(new URLSearchParams(window.location.search).get('flow'), 10)};
var qtwist = R.random_int(1,3);  //how many rotations the flow angle spans
if(new URLSearchParams(window.location.search).get('twist')){qtwist = parseInt(new URLSearchParams(window.location.search).get('twist'), 10)};
var qfocals = R.random_int(2,4); //number of swirl / focal points structuring the field
if(new URLSearchParams(window.location.search).get('focals')){qfocals = parseInt(new URLSearchParams(window.location.search).get('focals'), 10)};
var qztwist = R.random_int(15,35); //degrees a shape rotates through the layer stack (3D flow)
if(new URLSearchParams(window.location.search).get('ztwist')){qztwist = parseInt(new URLSearchParams(window.location.search).get('ztwist'), 10)};
var qdensity = R.random_int(6,9);//base packing density of shapes
if(new URLSearchParams(window.location.search).get('d')){qdensity = parseInt(new URLSearchParams(window.location.search).get('d'), 10)};
var qshapes = R.random_choice(["Circles","Rectangles","Dashes","Ellipses","Triangles","Arrows","Chevrons","Squiggles"]);
if(new URLSearchParams(window.location.search).get('shape')){qshapes = new URLSearchParams(window.location.search).get('shape')}; //shape type

var qorientation =R.random_int(1,2) < 2 ? "portrait" : "landscape";
var qframecolor = R.random_int(0,3) < 1 ? "White" : R.random_int(1,3) < 2 ? "Mocha" : "Random";     
var qmatwidth = R.random_int(50,50);


//fxparams
definitions = [
    {
        id: "layers",
        name: "Layers",
        type: "number",
        default: 12,
        options: {
            min: 6,
            max: 24,
            step: 1,
        },  
    },
    {
        id: "orientation",
        name: "Orientation",
        type: "select",
        default: qorientation,
        options: {options: ["portrait", "landscape"]},
    },
    {
        id: "aspectratio",
        name: "Aspect ratio",
        type: "select",
        default: "4:5",
        options: {options: ["1:1", "2:5","3:5","4:5","54:86","296:420"]},
    },
    {
        id: "size",
        name: "Size",
        type: "select",
        default: qsize,
        options: {options: ["1", "2", "3"]},
    },
    {
        id: "colors",
        name: "Max # of colors",
        type: "number",
        default: qcolors,
        options: {
            min: 1,
            max: 6,
            step: 1,
        },  
    },
    {
        id: "colors1",
        name: "Pallete 1",
        type: "select",
        default: qcolor1,
        options: {options: palleteNames},
    },
    {
        id: "colors2",
        name: "Pallete 2",
        type: "select",
        default: qcolor2,
        options: {options: palleteNames},
    },
    {
        id: "colors3",
        name: "Pallete 3",
        type: "select",
        default: qcolor3,
        options: {options: palleteNames},
    },
    {
        id: "framecolor",
        name: "Frame color",
        type: "select",
        default: qframecolor,
        options: {options: ["Random","White","Mocha"]},
    },
    {
        id: "flow",
        name: "Flow scale",
        type: "number",
        default: qflow,
        options: {
            min: 1,
            max: 8,
            step: 1,
        },
    },
    {
        id: "twist",
        name: "Flow twist",
        type: "number",
        default: qtwist,
        options: {
            min: 1,
            max: 4,
            step: 1,
        },
    },
    {
        id: "focals",
        name: "Focal points",
        type: "number",
        default: qfocals,
        options: {
            min: 0,
            max: 6,
            step: 1,
        },
    },
    {
        id: "ztwist",
        name: "Depth twist",
        type: "number",
        default: qztwist,
        options: {
            min: 0,
            max: 60,
            step: 5,
        },
    },
    {
        id: "density",
        name: "Density",
        type: "number",
        default: qdensity,
        options: {
            min: 4,
            max: 12,
            step: 1,
        },
    },
    {
        id: "shapes",
        name: "Shape",
        type: "select",
        default: qshapes,
        options: {options: ["Circles","Rectangles","Dashes","Ellipses","Triangles","Arrows","Chevrons","Squiggles"]},
    },
    {
        id: "matwidth",
        name: "Mat size",
        type: "number",
        default: qmatwidth,
        options: {
            min: 50,
            max: 150,
            step: 10,
        },  
    },
   
    ]


$fx.params(definitions)
var scale = $fx.getParam('size');
var stacks = $fx.getParam('layers');
var numofcolors = $fx.getParam('colors');


//Set the properties for the artwork where 100 = 1 inch
var wide = 800; 
var high = 1000; 

if ($fx.getParam('aspectratio')== "1:1"){wide = 800; high = 800};
if ($fx.getParam('aspectratio')== "2:5"){wide = 400; high = 1000};
if ($fx.getParam('aspectratio')== "3:5"){wide = 600; high = 1000};
if ($fx.getParam('aspectratio')== "4:5"){wide = 800; high = 1000};
if ($fx.getParam('aspectratio')== "54:86"){wide = 540; high = 860};
if ($fx.getParam('aspectratio')== "296:420"){wide =705; high = 1000};


var ratio = 1/scale;//use 1/4 for 32x40 - 1/3 for 24x30 - 1/2 for 16x20 - 1/1 for 8x10
var minOffset = ~~(7*ratio); //this is aproximatly .125"
var framewidth = ~~($fx.getParam('matwidth')*ratio*scale); 
var framradius = 0;


// Set a canvas size for when layers are exploded where 100=1in
var panelWide = 1600; 
var panelHigh = 2000; 
 
paper.view.viewSize.width = 2400;
paper.view.viewSize.height = 2400;


var colors = []; var palette = []; 

// set a pallete based on color schemes
var newPalette = [];
newPalette = this[$fx.getParam('colors1')].concat(this[$fx.getParam('colors2')],this[$fx.getParam('colors3')]);
for (c=0; c<numofcolors; c=c+1){palette[c] = newPalette[R.random_int(0, newPalette.length-1)]}  
console.log(newPalette);

//randomly assign colors to layers
for (c=0; c<stacks; c=c+1){colors[c] = palette[R.random_int(0, palette.length-1)];};

//or alternate colors
p=0;for (var c=0; c<stacks; c=c+1){colors[c] = palette[p];p=p+1;if(p==palette.length){p=0};}

console.log(colors);

if ($fx.getParam('framecolor')=="White"){colors[stacks-1]={"Hex":"#FFFFFF", "Name":"Smooth White"}};
if ($fx.getParam('framecolor')=="Mocha"){colors[stacks-1]={"Hex":"#4C4638", "Name":"Mocha"}};


var woodframe = new Path();var framegap = new Path();
var fColor = frameColors[R.random_int(0, frameColors.length-1)];
fColor = {"Hex":"#60513D","Name":"Walnut"};
var frameColor = fColor.Hex;

//adjust the canvas dimensions
w=wide;h=high;
var orientation="Portrait";
 
if ($fx.getParam('orientation')=="landscape"){wide = h;high = w;orientation="Landscape";};
if ($fx.getParam('orientation')=="portrait"){wide = w;high = h;orientation="Portrait";};

//setup the project variables


//Set the line color
linecolor={"Hex":"#4C4638", "Name":"Mocha"};


//************* Draw the layers ************* 


sheet = []; //This will hold each layer

var px=0;var py=0;var pz=0;var prange=.1; 


//************* FLOW FIELD SHAPE PLACEMENT *************
// Abstract shapes are placed along streamlines of a Perlin flow field. Each shape
// is cut out of every layer and shrinks in deeper layers, so it recedes into the
// stack like a stepped well. Shapes never overlap and keep a solid gap between
// them, so every layer remains a single connected piece that can be cut intact.

        var drawareawide = wide-framewidth*2;
        var drawareahigh = high-framewidth*2;

        // Each output uses exactly ONE shape type throughout the flow field.
        var shapeTypeMap = {
            "Circles":    "circle",
            "Rectangles": "rectangle",
            "Dashes":     "dash",
            "Ellipses":   "ellipse",
            "Triangles":  "triangle",
            "Arrows":     "arrow",
            "Chevrons":   "chevron",
            "Squiggles":  "squiggle"
        };
        var shapeMode = $fx.getParam('shapes');
        var theShape  = shapeTypeMap[shapeMode] || "dash";

        // Squiggles are rendered as true flow-field streamlines: each is a particle
        // traced through the field and drawn as one continuous, variable-length,
        // variable-thickness ribbon (rather than discrete repeated marks).
        var strokeMode = (theShape == "squiggle");

        var fieldCycles = $fx.getParam('flow');    // noise cycles across the width
        var fieldTwist  = $fx.getParam('twist');   // how many rotations the angle spans
        var density     = $fx.getParam('density'); // base packing density

        var fieldFreq = fieldCycles / drawareawide;
        var baseUnit  = drawareawide / density;    // nominal shape length

        // solid space kept around every shape so each layer holds together
        var gap = Math.max(minOffset*3, baseUnit*0.12);

        // 3D flow: as a shape recedes through the layers it also ROTATES, so it spirals
        // along x/y/z instead of insetting straight down. maxDrift is the largest angle
        // a shape can turn from its nominal (top-layer) angle across the whole stack.
        var maxDrift = ($fx.getParam('ztwist') || 0) * Math.PI/180;
        var cosD = Math.cos(maxDrift), sinD = Math.sin(maxDrift);

        // Exact axis-aligned half-extents of a box (hw0,hh0) rotated over [-maxDrift,
        // +maxDrift]. The extent peaks at the endpoint angle UNLESS the sweep passes the
        // angle that points a corner straight along the axis, where it reaches the full
        // circumradius. Getting this right is what keeps the no-overlap guarantee at any
        // depth-twist (an endpoint-only formula under-bounds thin shapes at large twist).
        function sweptHalf(hw0,hh0){
            var Rr = Math.sqrt(hw0*hw0+hh0*hh0);
            var ax = Math.atan2(hh0,hw0);   // angle that swings a corner onto +x
            var ay = Math.atan2(hw0,hh0);   // angle that swings a corner onto +y
            var sx = (ax <= maxDrift) ? Rr : (hw0*cosD + hh0*sinD);
            var sy = (ay <= maxDrift) ? Rr : (hw0*sinD + hh0*cosD);
            return [sx, sy];
        }

        // conservative max footprint (true upper bounds over every shape type;
        // chevron has the tallest perpendicular extent), used for spatial hashing and
        // frame insets. Extents are inflated by the rotation sweep so the footprint
        // bounds the shape at EVERY layer's angle; maxR is the gap-inflated circumradius.
        var maxL   = baseUnit*1.10;
        var maxTbb = baseUnit*1.30;
        var maxSwept = sweptHalf(maxL/2, maxTbb/2);
        var maxHwS = maxSwept[0] + gap/2;
        var maxHhS = maxSwept[1] + gap/2;
        var maxR   = Math.sqrt(maxHwS*maxHwS + maxHhS*maxHhS);

        // Shapes/streamlines may run right up to the mat border. frameIt() re-adds the
        // solid mat ring AFTER the shapes are cut, so anything spilling into the border
        // is clipped to a clean edge at exactly `framewidth`. This makes the visible
        // border equal the mat width, instead of mat width plus a full-shape inset.
        var inset = 0;
        var minX = framewidth + inset, maxX = wide - framewidth - inset;
        var minY = framewidth + inset, maxY = high - framewidth - inset;

        // ---- spatial hash for fast neighbour collision queries ----
        var cellSize = 2*maxR;   // = max interaction distance, so a 3x3 query is exhaustive
        var hashGrid = {};
        function hashKey(cx,cy){ return cx + "," + cy; }
        function hashInsert(s){
            var k = hashKey(Math.floor(s.x/cellSize), Math.floor(s.y/cellSize));
            if(!hashGrid[k]) hashGrid[k]=[];
            hashGrid[k].push(s);
        }
        function hashNeighbours(x,y){
            var cx = Math.floor(x/cellSize), cy = Math.floor(y/cellSize), out=[];
            for(var dx=-1;dx<=1;dx++) for(var dy=-1;dy<=1;dy++){
                var arr = hashGrid[hashKey(cx+dx,cy+dy)];
                if(arr) out = out.concat(arr);
            }
            return out;
        }

        // ---- focal points / singularities that structure the field into swirls ----
        // Each focal contributes a rotational (vortex/spiral) or radial (source/sink)
        // vector, weighted by a Gaussian falloff so it dominates its own region. The
        // organic Perlin noise is blended in at a lower weight, so the field reads as
        // deliberate swirls and centres rather than uniform randomness.
        var focals = [];
        for(var fi=0; fi<qfocals; fi++){
            var roll = R.random_num(0,1), rot;
            if(roll < 0.55){ rot = (R.random_bool(0.5)?1:-1) * Math.PI/2; }                                  // vortex (pure swirl)
            else if(roll < 0.85){ rot = (R.random_bool(0.5)?1:-1) * Math.PI/2 + R.random_num(-0.6,0.6); }    // spiral (swirl + drift)
            else { rot = R.random_bool(0.5) ? 0 : Math.PI; }                                                 // source / sink (radial)
            focals.push({
                x: R.random_num(framewidth + drawareawide*0.12, wide  - framewidth - drawareawide*0.12),
                y: R.random_num(framewidth + drawareahigh*0.12, high  - framewidth - drawareahigh*0.12),
                rot: rot,
                strength: R.random_num(0.9, 1.7),
                sigma: drawareawide * R.random_num(0.18, 0.45)   // radius of influence
            });
        }
        var noiseWeight = 0.55;   // organic wobble vs. structured focals

        // flow direction at a point: blend of the Perlin field and every focal's vector
        function flowAngle(x,y){
            var base = noise.get(x*fieldFreq, y*fieldFreq) * Math.PI * 2 * fieldTwist;
            var vx = Math.cos(base)*noiseWeight, vy = Math.sin(base)*noiseWeight;
            for(var fi=0; fi<focals.length; fi++){
                var f = focals[fi];
                var dx = x-f.x, dy = y-f.y, d2 = dx*dx+dy*dy;
                var w = f.strength * Math.exp(-d2/(2*f.sigma*f.sigma));
                var ang = Math.atan2(dy,dx) + f.rot;
                vx += Math.cos(ang)*w; vy += Math.sin(ang)*w;
            }
            return Math.atan2(vy, vx);
        }

        // oriented-bounding-box overlap via the separating axis theorem
        function obbOverlap(ax,ay,aa,ahw,ahh, bx,by,ba,bhw,bhh){
            var axAx=Math.cos(aa), ayAx=Math.sin(aa);   // box A local x axis
            var axAy=-Math.sin(aa), ayAy=Math.cos(aa);  // box A local y axis
            var axBx=Math.cos(ba), ayBx=Math.sin(ba);
            var axBy=-Math.sin(ba), ayBy=Math.cos(ba);
            var dx=bx-ax, dy=by-ay;
            var axes=[[axAx,ayAx],[axAy,ayAy],[axBx,ayBx],[axBy,ayBy]];
            for(var i=0;i<axes.length;i++){
                var Lx=axes[i][0], Ly=axes[i][1];
                var rA = ahw*Math.abs(axAx*Lx+ayAx*Ly) + ahh*Math.abs(axAy*Lx+ayAy*Ly);
                var rB = bhw*Math.abs(axBx*Lx+ayBx*Ly) + bhh*Math.abs(axBy*Lx+ayBy*Ly);
                if(Math.abs(dx*Lx+dy*Ly) > rA+rB) return false;  // separated
            }
            return true;
        }

        // can a shape sit here without touching its neighbours (incl. gap)?
        // Does a shape at (x,y,a) collide with anything already committed, or with
        // any earlier shape on the line currently being traced? Checked against the
        // gap-inflated footprints, so a "no collision" result guarantees a real solid
        // gap. The immediate predecessor is spaced prevHalf+gap+curHalf+EPS away, so it
        // clears this test by EPS and need not be special-cased.
        // half-extents inflated by the rotation sweep + gap, so the footprint bounds
        // the shape at every layer's angle (this is the exact axis-aligned bound of a
        // box rotating +/-maxDrift about its centre).
        function sweptHW(def){ return sweptHalf(def.L/2, def.Tbb/2)[0] + gap/2; }
        function sweptHH(def){ return sweptHalf(def.L/2, def.Tbb/2)[1] + gap/2; }
        function collidesAt(x,y,a,def,line){
            var hw = sweptHW(def), hh = sweptHH(def);
            var r  = Math.sqrt(hw*hw+hh*hh);
            var near = hashNeighbours(x,y);
            for(var i=0;i<near.length;i++){
                var s=near[i];
                var ddx=s.x-x, ddy=s.y-y;
                var shw=sweptHW(s.def), shh=sweptHH(s.def);
                var sr=Math.sqrt(shw*shw+shh*shh);
                if(ddx*ddx+ddy*ddy > (r+sr)*(r+sr)) continue;   // circle prefilter
                if(obbOverlap(x,y,a,hw,hh, s.x,s.y,s.a,shw,shh)) return true;
            }
            if(line){
                for(var i=0;i<line.length;i++){
                    var s=line[i];
                    var ddx=s.x-x, ddy=s.y-y;
                    var shw=sweptHW(s.def), shh=sweptHH(s.def);
                    var sr=Math.sqrt(shw*shw+shh*shh);
                    if(ddx*ddx+ddy*ddy > (r+sr)*(r+sr)) continue;
                    if(obbOverlap(x,y,a,hw,hh, s.x,s.y,s.a,shw,shh)) return true;
                }
            }
            return false;
        }
        var SPACE_EPS = Math.max(0.5, gap*0.05);   // strict-separation margin

        // pick a shape of the output's single type with its dimensions
        // (Tbb = perpendicular footprint used for collision)
        function randomShapeDef(){
            var type = theShape;   // one shape type per output
            var L = baseUnit * R.random_num(0.6, 1.1);
            var T, amp, st, waves, Tbb;
            // thin-biased thickness (tr^2): mostly slim marks, a few bold ones
            var tr=R.random_num(0,1);
            if(type=="rectangle"){ T=L*(0.16 + 0.58*tr*tr); Tbb=T; }
            else if(type=="dash"){ L=baseUnit*R.random_num(0.4,1.05); T=L*(0.20 + 0.45*tr*tr); Tbb=T; }
            else if(type=="ellipse"){ T=L*(0.22 + 0.70*tr*tr); Tbb=T; }
            else if(type=="circle"){ L=baseUnit*R.random_num(0.34,0.5); T=L; Tbb=T; }  // round dot for bead-strings
            else if(type=="triangle"){ T=L*R.random_num(0.55,0.95); Tbb=T; }
            else if(type=="arrow"){ T=L*R.random_num(0.45,0.78); Tbb=T; }
            else if(type=="chevron"){ T=L*R.random_num(0.3,0.5); st=L*R.random_num(0.12,0.18); Tbb=2*T+st; }
            else { /*squiggle*/ amp=L*R.random_num(0.14,0.24); st=L*R.random_num(0.10,0.16); waves=R.random_choice([1,1.5,2]); T=st; Tbb=2*amp+st; }
            return {type:type, L:L, T:T, amp:amp, st:st, waves:waves, Tbb:Tbb};
        }

        // Does a shape at (cx,cy) rotated by `a` fit entirely inside the mat opening,
        // keeping a solid gap from the frame? Uses the shape's own oriented bounding
        // box, so a small or frame-parallel mark can sit near the edge while a large
        // one is held further in — nothing is ever clipped by the frame.
        function insideFrame(cx,cy,a,def){
            var hw=def.L/2, hh=def.Tbb/2, extX, extY;
            if(maxDrift > 0.001){
                // shape rotates through the layers -> use its rotation-invariant
                // circumradius so it stays inside the mat at every angle it takes
                extX = extY = Math.sqrt(hw*hw+hh*hh);
            } else {
                var ca=Math.abs(Math.cos(a)), sa=Math.abs(Math.sin(a));
                extX = hw*ca + hh*sa;
                extY = hw*sa + hh*ca;
            }
            var m = gap;
            return (cx-extX >= framewidth+m) && (cx+extX <= wide-framewidth-m)
                && (cy-extY >= framewidth+m) && (cy+extY <= high-framewidth-m);
        }

        // Trace one streamline (flow-field method, per Damoon Rashidi): start at the
        // seed, step in the field direction placing a spaced shape each step, and
        // TERMINATE the line as soon as it would collide with an existing line. This
        // yields the clean, parallel, non-crossing flow lines of a classic flow field.
        // The whole line is committed only after tracing, so it never self-collides.
        var placed = [];
        function tracePlace(sx,sy){
            var x=sx, y=sy, steps=0, maxSteps=800, line=[], prev=null;
            while(steps<maxSteps){
                var a = flowAngle(x,y);
                var def = randomShapeDef();
                var cx=x, cy=y;
                if(prev){
                    // step from the previous shape's centre along the local flow, spaced
                    // by the swept (rotation-inflated) half-extents so the footprints sit
                    // gap+EPS apart even as both shapes twist through the layers
                    var spacing = sweptHW(prev.def) + sweptHW(def) + SPACE_EPS;
                    cx = prev.x + Math.cos(a)*spacing;
                    cy = prev.y + Math.sin(a)*spacing;
                }
                if(!insideFrame(cx,cy,a,def)) break;      // would touch the mat -> stop
                if(collidesAt(cx,cy,a,def,line)) break;   // hit another line -> stop
                // coherent per-shape twist: a smooth low-frequency field gives neighbouring
                // shapes similar drift, bounded by maxDrift, so the twist itself flows
                var driftN = noise.get(cx*fieldFreq + 53.7, cy*fieldFreq + 91.3);  // ~[0,1]
                var drift  = (driftN - 0.5) * 2 * maxDrift;
                var s={x:cx,y:cy,a:a,def:def,drift:drift};
                line.push(s); prev=s;
                x=cx; y=cy;                                // continue from here
                steps++;
            }
            for(var i=0;i<line.length;i++){ placed.push(line[i]); hashInsert(line[i]); }
        }

        //----- STREAMLINE-RIBBON ENGINE (squiggle mode) -----
        // A separate point-based spatial hash. Each committed streamline point is a
        // circle of radius (lineHalfWidth + gap/2); a new point may be placed only if
        // it clears every committed point's circle, so different ribbons always keep a
        // solid gap. Recession narrows the ribbon thickness per layer (the channel
        // tapers into the stack) — thinner ribbons stay strictly inside their full
        // footprint, so the no-overlap / single-piece guarantee is preserved.
        var strokes = [];                 // each: {pts:[{x,y}...], width}
        // widest a ribbon can get; ptCell must cover two of the largest footprints so
        // the 3x3 neighbour query stays exhaustive even for the boldest strokes.
        var minStrokeWidth = baseUnit*0.12;   // visible floor — no hairlines
        var maxStrokeWidth = baseUnit*0.60;
        var maxStrokePr = maxStrokeWidth/2 + gap/2 + (maxStrokeWidth*0.8)/2;
        var ptCell = Math.max(maxR, 2*maxStrokePr);
        var ptHash = {};
        function ptKey(cx,cy){ return cx + "," + cy; }
        function ptInsert(p){
            var k = ptKey(Math.floor(p.x/ptCell), Math.floor(p.y/ptCell));
            if(!ptHash[k]) ptHash[k]=[];
            ptHash[k].push(p);
        }
        function ptCollides(x,y,pr){
            var cx=Math.floor(x/ptCell), cy=Math.floor(y/ptCell);
            for(var dx=-1;dx<=1;dx++) for(var dy=-1;dy<=1;dy++){
                var arr=ptHash[ptKey(cx+dx,cy+dy)];
                if(!arr) continue;
                for(var i=0;i<arr.length;i++){
                    var q=arr[i], ddx=q.x-x, ddy=q.y-y, rr=pr+q.pr;
                    if(ddx*ddx+ddy*ddy < rr*rr) return true;
                }
            }
            return false;
        }
        function traceStroke(sx,sy){
            // thin-biased width: mostly fine lines with occasional bold strokes (wr^2)
            var wr = R.random_num(0,1);
            var width  = minStrokeWidth + (maxStrokeWidth - minStrokeWidth)*wr*wr;
            var stepLen= Math.max(3, width*0.8);                 // smooth + full coverage
            // collision radius = half-width + half the solid gap + a half-step margin.
            // The half-step covers the fact that we only test discrete sample points of
            // a continuous ribbon, so two ribbons still keep a true `gap` of solid space.
            var pr     = width/2 + gap/2 + stepLen/2;
            var maxLen = drawareawide * R.random_num(0.10, 0.6); // wide length variation
            // a stroke must be at least this long to read as a line; shorter traces are
            // dropped so we never render a near-zero ribbon (which caps into a "lens" blob)
            var minLen = Math.max(width*3.0, baseUnit*0.5);
            var m = width/2 + gap;   // keep the ribbon (incl. round caps) inside the mat
            // a line must never close a loop (which would seal a solid island in the
            // centre). Two guards: cap total turning below a full revolution, and stop
            // if the path folds back near its own earlier course.
            var maxTurn = Math.PI*1.7;                 // ~306deg: never enough to close
            var selfDist = width + gap;                // centre-line fold-back threshold
            var lookback = Math.ceil(selfDist/stepLen) + 2;
            function foldsBack(nx,ny,limit){
                for(var i=0;i<limit;i++){
                    var dx=pts[i].x-nx, dy=pts[i].y-ny;
                    if(dx*dx+dy*dy < selfDist*selfDist) return true;
                }
                return false;
            }
            var x=sx, y=sy, len=0, pts=[], turn=0, prevA=null;
            while(len < maxLen){
                if(x<framewidth+m||x>wide-framewidth-m||y<framewidth+m||y>high-framewidth-m) break;
                if(ptCollides(x,y,pr)) break;                    // hit another ribbon -> stop
                if(pts.length>lookback && foldsBack(x,y,pts.length-lookback)) break; // would seal -> stop
                pts.push({x:x,y:y});
                var a = flowAngle(x,y);
                if(prevA!==null){
                    var da=a-prevA;
                    while(da> Math.PI) da-=2*Math.PI;
                    while(da<-Math.PI) da+=2*Math.PI;
                    turn+=da;
                    if(Math.abs(turn) > maxTurn) break;          // winding into a loop -> stop
                }
                prevA=a;
                x += Math.cos(a)*stepLen; y += Math.sin(a)*stepLen;
                len += stepLen;
            }
            var tracedLen = (pts.length-1)*stepLen;
            if(pts.length >= 3 && tracedLen >= minLen){
                for(var i=0;i<pts.length;i++){ pts[i].pr=pr; ptInsert(pts[i]); }
                strokes.push({pts:pts, width:width});
            }
        }

        // Seed densely so terminated lines still pack the canvas: a jittered grid plus
        // extra random spawn points (random spawning, per the article). All seeds are
        // shuffled deterministically (fxhash) so order — and thus the result — is stable.
        var seeds=[], seedStep=baseUnit*0.5;
        for(var sy=minY; sy<=maxY; sy+=seedStep){
            for(var sx=minX; sx<=maxX; sx+=seedStep){
                seeds.push({x:sx+R.random_num(-seedStep/2,seedStep/2),
                            y:sy+R.random_num(-seedStep/2,seedStep/2)});
            }
        }
        var randomSeeds = Math.floor((drawareawide*drawareahigh)/(baseUnit*baseUnit))*4;
        for(var i=0;i<randomSeeds;i++){
            seeds.push({x:R.random_num(minX,maxX), y:R.random_num(minY,maxY)});
        }
        for(var i=seeds.length-1;i>0;i--){ var j=R.random_int(0,i); var t=seeds[i]; seeds[i]=seeds[j]; seeds[j]=t; }
        if(strokeMode){
            for(var i=0;i<seeds.length;i++){ traceStroke(seeds[i].x, seeds[i].y); }
            console.log("streamline ribbons: "+strokes.length);
        } else {
            for(var i=0;i<seeds.length;i++){ tracePlace(seeds[i].x, seeds[i].y); }
            console.log("placed shapes: "+placed.length);
        }
        var shapeCount = strokeMode ? strokes.length : placed.length;

        // build a Paper path for one shape, centred at origin, pointing along +x
        function makeShapePath(def, s){
            var L=def.L*s, T=def.T*s, p;
            if(def.type=="rectangle"){
                p=new Path.Rectangle({point:[-L/2,-T/2], size:[L,T], radius:T*0.28, insert:false});
            } else if(def.type=="dash"){
                p=new Path.Rectangle({point:[-L/2,-T/2], size:[L,T], radius:T/2, insert:false});
            } else if(def.type=="ellipse"){
                p=new Path.Ellipse({center:[0,0], size:[L,T], insert:false});
            } else if(def.type=="circle"){
                p=new Path.Circle({center:[0,0], radius:L/2, insert:false});
            } else if(def.type=="triangle"){
                p=new Path({segments:[[-L/2,-T/2],[-L/2,T/2],[L/2,0]], closed:true, insert:false});
            } else if(def.type=="arrow"){
                var hl=L*0.4, st=T*0.42;
                p=new Path({segments:[
                    [-L/2,-st/2],[L/2-hl,-st/2],[L/2-hl,-T/2],[L/2,0],
                    [L/2-hl,T/2],[L/2-hl,st/2],[-L/2,st/2]
                ], closed:true, insert:false});
            } else if(def.type=="chevron"){
                var T2=def.T*s, st=def.st*s;
                var cl=new Path({segments:[[-L/2,-T2],[L/2,0],[-L/2,T2]], insert:false});
                p=PaperOffset.offsetStroke(cl, st/2, {cap:'round', join:'round'});
                cl.remove();
            } else { /*squiggle*/
                var amp=def.amp*s, st=def.st*s, waves=def.waves, seg=16;
                var cl=new Path({insert:false});
                for(var k=0;k<=seg;k++){
                    cl.add(new Point(-L/2+L*(k/seg), Math.sin((k/seg)*Math.PI*2*waves)*amp));
                }
                cl.smooth({type:'catmull-rom'});
                p=PaperOffset.offsetStroke(cl, st/2, {cap:'round', join:'round'});
                cl.remove();
            }
            return p;
        }

        // every streamline ribbon, thinned for layer z (top = full width, deeper =
        // narrower, so each channel tapers into the stack). Ribbons keep their gap, so
        // a plain CompoundPath is a valid union cut in a single subtract.
        function buildStrokeMask(z){
            var topZ = (stacks>1) ? (stacks-1) : 1;
            var t = z/topZ;   // 1 at the top layer, 0 at the deepest layer
            var mask = new CompoundPath({insert:false});
            for(var i=0;i<strokes.length;i++){
                var st = strokes[i];
                // Even taper: every stroke insets linearly to a point at the back layer,
                // so a wide ribbon closes just like a thin one (no large residual opening).
                var halfAtZ = (st.width/2) * t;
                if(halfAtZ < 0.75) continue;   // too thin to cut -> solid (closes the well bottom)
                var cl = new Path({insert:false});
                for(var k=0;k<st.pts.length;k++){ cl.add(new Point(st.pts[k].x, st.pts[k].y)); }
                cl.smooth({type:'catmull-rom'});
                var ribbon = PaperOffset.offsetStroke(cl, halfAtZ, {cap:'round', join:'round'});
                cl.remove();
                if(ribbon.className=="CompoundPath"){
                    var ch=ribbon.children;
                    for(var c=ch.length-1;c>=0;c--){ mask.addChild(ch[c]); }
                    ribbon.remove();
                } else {
                    mask.addChild(ribbon);
                }
            }
            return mask;
        }

        // union of every placed shape, scaled for layer z (they never overlap,
        // so a plain CompoundPath is a valid union and one subtract cuts them all)
        function buildCutMask(z){
            if(strokeMode) return buildStrokeMask(z);
            var topZ = (stacks>1) ? (stacks-1) : 1;
            var minS = 0.14;
            var s = minS + (1-minS)*(z/topZ);   // top layer full, deeper smaller
            var frac = (topZ - z)/topZ;         // 0 at the top layer, 1 at the deepest
            var mask = new CompoundPath({insert:false});
            for(var i=0;i<placed.length;i++){
                var sh=placed[i];
                // 3D flow: each deeper layer rotates further from the nominal angle, so
                // the recess spirals through x/y/z instead of insetting straight down
                var ang = sh.a + sh.drift*frac;
                var path=makeShapePath(sh.def, s);
                path.rotate(ang*180/Math.PI);
                path.position = new Point(sh.x, sh.y);
                if(path.className=="CompoundPath"){
                    var ch=path.children;
                    for(var c=ch.length-1;c>=0;c--){ mask.addChild(ch[c]); }
                    path.remove();
                } else {
                    mask.addChild(path);
                }
            }
            return mask;
        }



var features = {};
var renderTime;

paper.view.autoUpdate = false;

(async () => {

// Warm-up: force one paint/yield before any Clipper boolean runs. The very first
// Clipper op silently returns empty if it executes before paper.js has rendered once,
// which would drop the first (bottom) layer's frame and leave the piece a layer short.
paper.view.update();
await new Promise(resolve => setTimeout(resolve, 0));

//---- Draw the Layers


for (z = 0; z < stacks; z++) {
    pz=z*prange;
    
    drawFrame(z); // Draw the initial frame
    solid(z);
    //if(z==0){solid(z)}

         //-----Draw each layer
        if(z<stacks-1 && z!=0 ){
            if (z==stacks-2){oset = minOffset}else{oset = ~~(minOffset*(stacks-z-1))}
            var li = R.random_int(12, 12);
            for (l=0;l<li;l++){
                //somelines(z); 
            }
            

        }


        
        // cut every flow-field shape out of this layer in one pass
        var mask = buildCutMask(z);
        cut(z, mask);

    frameIt(z);// finish the layer with a final frame cleanup 

    cutMarks(z);
    hanger(z);// add hanger holes
    if (z == stacks-1) {signature(z);}// sign the top layer
    sheet[z].scale(2.2);
    sheet[z].position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
   
    var group = new Group(sheet[z]);
    
    console.log(z)//Show layer completed in console

    paper.view.update();
    await new Promise(resolve => setTimeout(resolve, 0));

}//end z loop

//--------- Finish up the preview ----------------------- 

    // Build the features and trigger an fxhash preview
    features = {};
    features.Size =  ~~(wide/100/ratio)+" x "+~~(high/100/ratio)+" inches";
    features.Width = ~~(wide/100/ratio);
    features.Height = ~~(high/100/ratio);
    features.Depth = stacks*0.0625;
    features.Layers = stacks;
    features.Shapes = shapeMode;
    features.Flow = fieldCycles;
    features.Twist = fieldTwist;
    features["Shape count"] = shapeCount;
    for (l=stacks;l>0;l--){
    var key = "layer: "+(stacks-l+1)
    features[key] = colors[l-1].Name
    }
    console.log(features);
    $fx.features(features);
    //$fx.preview();

//Begin send to studio.shawnkemp.art **************************************************************
     studioAPI.setApiBase('https://studio-shawnkemp-art.vercel.app');
     if(new URLSearchParams(window.location.search).get('skart')){sendAllExports()};
//End send to studio.shawnkemp.art **************************************************************

      var finalTime = new Date().getTime();
    renderTime = (finalTime - initialTime)/1000
    console.log ('Render took : ' +  renderTime.toFixed(2) + ' seconds' );

    paper.view.autoUpdate = true;
    paper.view.update();

})();

async function sendAllExports() {

        paper.view.update();
        // Send canvas as PNG
        await studioAPI.sendCanvas(myCanvas, $fx.hash, $fx.hash+".png");

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, $fx.hash+".svg");

        // send colors
        var content = JSON.stringify(features,null,2);

        // Send text/JSON
        await studioAPI.sendText(JSON.stringify(colors), $fx.hash, "Colors-"+$fx.hash+".json");

        // 2. Add frame
        floatingframe();
        paper.view.update();
        // 3. Framed PNGs (Black, White, Walnut, Maple)
        var frameOptions = [
            { name: "Black", hex: "#1f1f1f" },
            { name: "White", hex: "#f9f9f9" },
            { name: "Walnut", hex: "#60513D" },
            { name: "Maple", hex: "#ebd9c0" }
        ];
        for (var i = 0; i < frameOptions.length; i++) {
            woodframe.style = { fillColor: frameOptions[i].hex };
            var fileName = "Framed" + frameOptions[i].name + "-" + $fx.hash;
            paper.view.update();

            await studioAPI.sendCanvas(myCanvas,  $fx.hash, fileName+".png");
        }
        // 4. Remove frame
        floatingframe();
        // 5. Blueprint SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: lightburn[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        paper.view.update();

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Blueprint-" + $fx.hash+".svg");
        // 6. Plotting SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: plottingColors[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        for (var z = 0; z < stacks; z++) {
            if (z < stacks - 1) {
                for (var zs = z + 1; zs < stacks; zs++) {
                    var old = sheet[z];
                    sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                    old.remove();
                }
            }
        }
        paper.view.update();
        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Plotting-" + $fx.hash+".svg");

        // Send features
        await studioAPI.sendFeatures($fx.hash, features);

        console.log("All exports sent!");
        studioAPI.signalComplete();
    }


      

//vvvvvvvvvvvvvvv PROJECT FUNCTIONS vvvvvvvvvvvvvvv 
 
function somelines(z){
        p = []
        y = R.random_int(0, high);
        p[0]=new Point(0,y)
        y2 = R.random_int(0, high);
        p[1]=new Point(wide,y2)
        lines = new Path.Line (p[0],p[1]); 
        mesh = PaperOffset.offsetStroke(lines, minOffset,{ cap: 'butt' });
        mesh.flatten(4);
        mesh.smooth();
        lines.remove();
        join(z,mesh); 
        mesh.remove();

    
}




//^^^^^^^^^^^^^ END PROJECT FUNCTIONS ^^^^^^^^^^^^^ 




//--------- Helper functions ----------------------- 

function floatingframe(){
    var frameWide=~~(34*ratio);var frameReveal = ~~(12*ratio);
  if (framegap.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(~~(wide+frameReveal*2), ~~(high+frameReveal*2)), framradius)
        var insideframe = new Path.Rectangle(new Point(frameReveal, frameReveal),new Size(wide, high)) 
        framegap = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        framegap.scale(2.2);
        framegap.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        framegap.style = {fillColor: '#1A1A1A', strokeColor: "#1A1A1A", strokeWidth: 1*ratio};
    } else {framegap.removeChildren()} 
    
    if (woodframe.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide+frameWide*2+frameReveal*2, high+frameWide*2+frameReveal*2), framradius)
        var insideframe = new Path.Rectangle(new Point(frameWide, frameWide),new Size(wide+frameReveal*2, high+frameReveal*2)) 
        woodframe = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        woodframe.scale(2.2);
        woodframe.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        var framegroup = new Group(woodframe);
        woodframe.style = {fillColor: frameColor, strokeColor: "#60513D", strokeWidth: 2*ratio,shadowColor: new Color(0,0,0,[0.5]),shadowBlur: 20,shadowOffset: new Point(10*2.2, 10*2.2)};
    } else {woodframe.removeChildren()} 
    //fileName = "Framed-"+$fx.hash;
}

function rangeInt(range,x,y,z){
    var v = ~~(range-(noise.get(x,y,z)*range*2));
    return (v);
}

// Add shape s to sheet z
function join(z,s){
    var old = sheet[z];
    sheet[z] = clipUnite(s, sheet[z]);
    old.remove();
    s.remove();
}

// Subtract shape s from sheet z
function cut(z,s){
    var old = sheet[z];
    sheet[z] = clipSubtract(sheet[z], s);
    old.remove();
    s.remove();
}

function drawFrame(z){
    var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
    var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2)) 
    //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
    //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);


    sheet[z] = clipSubtract(outsideframe, insideframe);
    outsideframe.remove();insideframe.remove();
}


function solid(z){
    outsideframe = new Path.Rectangle(new Point(1,1),new Size(wide-1, high-1), framradius)
    //outsideframe = new Path.Circle(new Point(wide/2),wide/2)
    var old = sheet[z];
    sheet[z] = clipUnite(sheet[z], outsideframe);
    old.remove();
    outsideframe.remove();
}



function frameIt(z){
        //Trim to size
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        var old = sheet[z];
        sheet[z] = clipIntersect(outsideframe, sheet[z]);
        old.remove();
        outsideframe.remove();

        //Make sure there is still a solid frame
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2))
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);

        var frame = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        var old = sheet[z];
        sheet[z] = clipUnite(sheet[z], frame);
        old.remove();
        frame.remove();
         
        
        sheet[z].style = {fillColor: colors[z].Hex, strokeColor: linecolor.Hex, strokeWidth: 1*ratio,shadowColor: new Color(0,0,0,[0.15]),shadowBlur: 8,shadowOffset: new Point((stacks-z)*1.2, (stacks-z)*1.2)};
}

function cutMarks(z){
    if (z<stacks-1 && z!=0) {
          for (etch=0;etch<stacks-z;etch++){
                var layerEtch = new Path.Circle(new Point(50+etch*10,25),2)
                cut(z,layerEtch)
            } 
        }
}

function signature(z){
    shawn = new CompoundPath(sig);
    shawn.strokeColor = 'green';
    shawn.fillColor = 'green';
    shawn.strokeWidth = 1;
    shawn.scale(ratio*.9)
    shawn.position = new Point(wide-framewidth-~~(shawn.bounds.width/2), high-framewidth+~~(shawn.bounds.height));
    cut(z,shawn)
}

function hanger (z){
    if (z < stacks-2 && scale>0){
        var r = 30*ratio;
        rt = 19*ratio;
        if (z<3){r = 19*ratio}
        layerEtch = new Path.Rectangle(new Point(framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide-framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(wide-framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide/2, framewidth/2),new Size(r*4, r*2), r)
        layerEtch.position = new Point(wide/2,framewidth/2);   
        cut(z,layerEtch)
    }
}




//--------- Interaction functions -----------------------
var interactiontext = "Interactions\nB = Blueprint mode\nV = Export SVG\nP = Export PNG\nC = Export colors as TXT\nE = Show layers\nF = Add floating frame\nL = Format for plotting"

view.onDoubleClick = function(event) {
    alert(interactiontext);
    console.log(project.exportJSON());
    //canvas.toBlob(function(blob) {saveAs(blob, tokenData.hash+'.png');});
};

document.addEventListener('keypress', (event) => {

       //Save as SVG 
       if(event.key == "v") {
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));
            var key = [];for (l=stacks;l>0;l--){key[stacks-l] = colors[l-1].Name;}; 
            var svg1 = "<!--"+key+"-->" + paper.project.exportSVG({asString:true})
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg1);
            var link = document.createElement("a");
            link.download = fileName;
            link.href = url;
            link.click();
            }


        if(event.key == "f") {
            floatingframe();
            
        }
        
        if(event.key == "1") {
            frameColor = {"Hex":"#4C46380", "Name":"Black"};
            fileName = "FramedBlack-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "2") {
            frameColor = {"Hex":"#f9f9f9","Name":"White"};
            fileName = "FramedWhite-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "3") {
            frameColor = {"Hex":"#60513D","Name":"Walnut"};
            fileName = "FramedWalnut-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "4") {
            frameColor = {"Hex":"#ebd9c0","Name":"Maple"};
            fileName = "FramedMaple-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
            
        if(event.key == "V") {
            fileName = "Vector-"+$fx.hash;
        }  


       //Format for Lightburn
       if(event.key == "b") {
        fileName = "blueprint-"+$fx.hash;
            for (z=0;z<stacks;z++){
                sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: lightburn[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
                sheet[z].selected = true;}
            }

       //Format for plotting
       if(event.key == "l") {
            fileName = "Plotting-"+$fx.hash;

            for (z=0;z<stacks;z++){
            sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: plottingColors[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
            sheet[z].selected = true;
            }
        
            for (z=0;z<stacks;z++){
                if (z<stacks-1){
                    for (zs=z+1;zs<stacks;zs++){
                        var old = sheet[z];
                        sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                        old.remove();
                    }
                }
                console.log("optimizing")
            }
        }

        //new hash
        if(event.key == " ") {
            setquery("fxhash",null);
            location.reload();
            }

        //help
       if(event.key == "h" || event.key == "/") {
            alert(interactiontext);
            }
             
        //Save as PNG
        if(event.key == "p") {
            canvas.toBlob(function(blob) {saveAs(blob, fileName+'.png');});
            }

        //Export colors as txt
        if(event.key == "c") {
            content = JSON.stringify(features,null,2);
            console.log(content);
            var filename = "Colors-"+$fx.hash + ".txt";
            var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            saveAs(blob, filename);
            }

        //send to studio.shawnkemp.art
        if(event.key == "s") {
            sendAllExports()
            }  

       //Explode the layers     
       if(event.key == "e") {   
            //floatingframe();  
            h=0;t=0;maxwidth=3000;
               for (z=0; z<sheet.length; z++) { 
               sheet[z].scale(1000/2300)   
               sheet[z].position = new Point(wide/2,high/2);        
                    sheet[z].position.x += wide*h;
                    sheet[z].position.y += high*t;
                    sheet[z].selected = true;
                    if (wide*(h+2) > panelWide) {maxwidth=wide*(h+1);h=0;t++;} else{h++};
                    }  
            paper.view.viewSize.width = maxwidth;
            paper.view.viewSize.height = high*(t+1);
           }
 
}, false); 
}