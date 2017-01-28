// fork getUserMedia for multiple browser versions, for the future
// when more browsers support MediaRecorder

navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

// set up basic variables for app

var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');

var mimeTypeOgg = 'audio/ogg'; // ';codecs=opus';
var mimeTypeWebM = 'audio/webm;codecs=opus';
var mimeType;

if (MediaRecorder.isTypeSupported(mimeTypeOgg)) {
	mimeType = mimeTypeOgg;  // Firefox
} else if (MediaRecorder.isTypeSupported(mimeTypeWebM)) {
	mimeType = mimeTypeWebM; // Chrome
}

// disable stop button while not recording

stop.disabled = true;

// visualiser setup - create web audio api context and canvas

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");

//main block for doing the audio recording

if (navigator.getUserMedia) {
  console.log('getUserMedia supported.');

  var constraints = { audio: true };
  var chunks = [];

  var onSuccess = function(stream) {
    var mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

    visualize(stream);

    record.onclick = function() {
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log("recorder started");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("recorder stopped");
      record.style.background = "";
      record.style.color = "";
      // mediaRecorder.requestData();

      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      var clipName = prompt('Enter a name for your sound clip?','My unnamed clip');
      console.log(clipName);
      var clipContainer = document.createElement('article');
      var clipLabel = document.createElement('p');
      var audio = document.createElement('audio');
      var deleteButton = document.createElement('button');
     
      clipContainer.classList.add('clip');
      audio.setAttribute('controls', '');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';

      if(clipName === null) {
        clipLabel.textContent = 'My unnamed clip';
      } else {
        clipLabel.textContent = clipName;
      }

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      var blob = new Blob(chunks, { 'type' : mimeType });
      chunks = [];
      var audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }
	  if (mimeType === mimeTypeOgg) {
	      var speechToTextButton = document.createElement('button');
		  speechToTextButton.textContent = 'Speech To Text';
		  speechToTextButton.className = 'speechToText';
	      clipContainer.appendChild(speechToTextButton);
		  
	  
		  speechToTextButton.onclick = function (e) {
			  console.log('speechToText', e);
			  console.log('mediaRecorder.mimeType',mediaRecorder.mimeType)
			  console.log('blob', blob);
			  
		      var loading = document.createElement('div');
			  loading.className = 'loading';
		      loading.textContent = 'Loading...';
			  clipContainer.appendChild(loading);
		  
			  // TODO: send `blob` to Watson 
			  // https://www.ibm.com/watson/developercloud/doc/speech-to-text/http.shtml
			  var xhr = new XMLHttpRequest();

			  // Using NodeRed as a proxy to IBM Watson - having enabled CORS by uncommenting the `httpNodeCors` object in `/data/settings.js`
			  xhr.open("POST", 'http://localhost:1880/watson/speech-to-text', true);
			  xhr.setRequestHeader('Access-Control-Allow-Origin', location.origin);
			  xhr.setRequestHeader('Content-Type', mimeType);
			  xhr.onload = function (oEvent) {
			    // Uploaded.
				  console.log('Uploaded', oEvent); //Outputs a DOMString by default
				  

			  };
			  xhr.onreadystatechange = function() {
			    if (xhr.readyState === 4) {
			      console.log('Response', xhr.response); //Outputs a DOMString by default
				  
				  var response = JSON.parse(xhr.response);
				  console.log('Transcript: ' + response.results[0].alternatives[0].transcript );
				  
			      var transcript = document.createElement('div');
				  transcript.className = 'transcript';
			      transcript.textContent = response.results[0].alternatives[0].transcript;

				  clipContainer.removeChild(loading);
				  clipContainer.appendChild(transcript);
				  
			    }
			  }
			  xhr.send(blob);
		  }
	  }

      clipLabel.onclick = function() {
        var existingName = clipLabel.textContent;
        var newClipName = prompt('Enter a new name for your sound clip?');
        if(newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    }
  }

  var onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.getUserMedia(constraints, onSuccess, onError);
} else {
   console.log('getUserMedia not supported on your browser!');
}

function visualize(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  //analyser.connect(audioCtx.destination);
  
  WIDTH = canvas.width
  HEIGHT = canvas.height;

  draw()

  function draw() {

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(220, 220, 220)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;


    for(var i = 0; i < bufferLength; i++) {
 
      var v = dataArray[i] / 128.0;
      var y = v * HEIGHT/2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();

  }
}

