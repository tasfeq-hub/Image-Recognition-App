$(document).ready(function(){

    const video_1 = document.getElementById('video_1');
    const canvas_1 = document.getElementById('canvas_1');
    const startButton_1 = document.getElementById('startButton_1');
    const video_2 = document.getElementById('video_2');
    const canvas_2 = document.getElementById('canvas_2');
    const startButton_2 = document.getElementById('startButton_2');
    const overlayDiv_1 = document.querySelector(".video-overlay-1");
    const overlayDiv_2 = document.querySelector(".video-overlay-2");
    var width_1 = 500; //width of video element1 and canvas1
    var width_2 = 500; //width of video element2 and canvas2   
    var height_1 = 480; //height of video element1 and canvas1
    var height_2 = 480; //height of video element2 and canvas2
    var firstWebcamStream; //to on/of webcam for first image
    var secondWebcamStream; //to on/of webcam for second image
    
    var imageId = imageKeyGenerator(); // key generated for storing both images in the s3 bucket with common identifier 
    var bucketName = ""; // define AWS S3 bucket name
    var bucketKey = ''; // define 'key'(folder name) of S3 Bucket where pictures are stored
    var imageOne = bucketKey+'/img_'+imageId+'_1.png'; // used in AWS Constructor
    var imageTwo = bucketKey+'/img_'+imageId+'_2.png' // used in AWS Consturctor
     
    /* parameters required for detecting face borders of both images */ 
    var boundaryParams = {
        "Attributes": [ "ALL" ],
        "Image": { 
            "S3Object": { 
                Bucket: bucketName
            }
        }
    };
    /* parameters required for AWS Rekognition */
    /* better practice would be loading from locally stored configuration file in future */
    var rekognitionCredentials = {
        region: '' // define region,
        accessKeyId: "", //define access key ID of AWS account
        secretAccessKey: "" // define secret access key of AWS account
    };
    
    startButton_1.addEventListener('click',function(e){
        e.preventDefault();
        takePictureOne();
    },false);

    navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then(function(stream){
            firstWebcamStream = stream;
            video_1.srcObject = firstWebcamStream;
            video_1.setAttribute('width',width_1);
            video_1.setAttribute('height',height_1);
            video_1.play();
    })
    .catch(function(err){
        console.log("An error occurred: "+err);
    });

    function takePictureOne(){
        var context_1 = canvas_1.getContext('2d');
        if(width_1 && height_1){
            canvas_1.width = width_1;
            canvas_1.height = height_1;
            context_1.drawImage(video_1,0,0,width_1,height_1);
            canvas_1.toBlob(function(blob_1){
                uploadPhotoOneToS3(blob_1);     
            });
        }else{
            // for future modification
        }
    };

    function uploadPhotoOneToS3(imageBlob){
        var bucketCredentials = rekognitionCredentials;
        bucketCredentials.Bucket = bucketName; // extra parameter needed for uploading file to s3 bucket
        let s3bucket = new AWS.S3(bucketCredentials);
        var params = {
            Bucket: bucketName, 
            Key: imageOne, 
            Body: imageBlob
        };
        s3bucket.upload(params,function(err,data) {
            detectBoundaryBoxOne();
        });
    };

    startButton_2.addEventListener('click',function(e){
        e.preventDefault();
        takePictureTwo();
    },false);
    
    function enable2ndCamera(){
        navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then(function(stream){
            secondWebcamStream = stream;
            video_2.srcObject = secondWebcamStream;
            video_2.setAttribute('width',width_2);
            video_2.setAttribute('height',height_2);
            video_2.play();
        })
        .catch(function(err){
            console.log("An error occurred: "+err);
        });
    };
    
    function takePictureTwo(){
        var context_2 = canvas_2.getContext('2d');
        if(width_2 && height_2){
            canvas_2.width = width_2;
            canvas_2.height = height_2;
            context_2.drawImage(video_2,0,0,width_2,height_2);
            canvas_2.toBlob(function(blob_2){
                uploadPhotoTwoToS3(blob_2);     
            });
        }else{
            // for future modification
        }
    };

    function uploadPhotoTwoToS3(imageBlob){
        var bucketCredentials = rekognitionCredentials;
        bucketCredentials.Bucket = bucketName; // extra parameter needed for uploading file to s3 bucket
        let s3bucket = new AWS.S3(bucketCredentials);
        var params = {
            Bucket: bucketName, 
            Key: imageTwo, 
            Body: imageBlob
        };
        s3bucket.upload(params,function(err,data) {
            detectBoundaryBoxTwo();
        });
    };
    
    compareButton.addEventListener('click',function(e){
        e.preventDefault();
        faceCompareRequest();
    });

    function faceCompareRequest(){
        var rekognition = new AWS.Rekognition(rekognitionCredentials);
        var params = {
            SimilarityThreshold: 90, 
            SourceImage: {
                S3Object: {
                    Bucket: bucketName, 
                    Name: imageOne
                }
            }, 
            TargetImage: {
                S3Object: {
                    Bucket: bucketName, 
                    Name: imageTwo
                }
            }
        };
        rekognition.compareFaces(params,function(err,data){
            if(err){
                console.log(err,err.stack); 
            }else{
                if(data.FaceMatches[0]){ // if response data has value of matched face
                    $('#myModal').modal('show');
                }else{ // if response data has value of unmatched face
                    $('#myModal').modal('show');
                    $(".modal-body #message-image").attr("src", "sad.png");
                    $('#imageModalLabel').html("Face not matched!");
                };
            };
        });
    };

    /* detect boundary box of image 1 and draw rectangle on the canvas 1 */
    function detectBoundaryBoxOne(){
        var rekognition = new AWS.Rekognition(rekognitionCredentials);
        boundaryParams.Image.S3Object.Name = imageOne;
        rekognition.detectFaces(boundaryParams,function(err,data){
            if(data){
                disableWebcamOne();
                //detectTextOfImageOne(); /* use this function to extract texts inside of image. eg. date of birth, city, etc */
                var BoundingBox = data.FaceDetails[0].BoundingBox;
                var x = (BoundingBox.Left * 500);
                var y = (BoundingBox.Top * 480);
                var box_width = (BoundingBox.Width * 500);
                var box_height = (BoundingBox.Height * 480);
                var c = document.getElementById("canvas_1");
                var ctx = c.getContext("2d");
                ctx.rect(parseInt(x),parseInt(y),parseInt(box_width),parseInt(box_height));
                ctx.lineWidth = "3";
                ctx.strokeStyle = "limegreen";
                ctx.stroke();
                //console.log(data.FaceDetails[0].Landmarks); /* all the face attributes of an image e.g. eye co-ordinates,nose-ordinates etc */
            }
        }); 
    };

    /* detect boundary box of image 2 and draw rectangle on the canvas 2 */
    function detectBoundaryBoxTwo(){
        var rekognition = new AWS.Rekognition(rekognitionCredentials);
        boundaryParams.Image.S3Object.Name = imageTwo;
        rekognition.detectFaces(boundaryParams,function(err,data){
            if(data){
                disableWebcamTwo();
                var BoundingBox = data.FaceDetails[0].BoundingBox;
                var x = (BoundingBox.Left * 500);
                var y = (BoundingBox.Top * 480);
                var box_width = (BoundingBox.Width * 500);
                var box_height = (BoundingBox.Height * 480);
                var c = document.getElementById("canvas_2");
                var ctx = c.getContext("2d");
                ctx.rect(parseInt(x),parseInt(y),parseInt(box_width),parseInt(box_height));
                ctx.lineWidth = "3";
                ctx.strokeStyle = "limegreen";
                ctx.stroke();
                console.log(data.FaceDetails[0].Landmarks);
            }
        }); 
    };

    /* disable 1st webcam after taking first image */
    function disableWebcamOne(){
        video_1.pause();
        firstWebcamStream.getTracks()[0].stop();
        overlayDiv_1.style.display="block";
        enable2ndCamera();
        startButton_1.disabled = true;
        startButton_2.disabled = false;
    };

    /* disable 2nd webcam after comparing image */
    function disableWebcamTwo(){
        video_2.pause();
        secondWebcamStream.getTracks()[0].stop();
        overlayDiv_2.style.display = "block";
        startButton_2.disabled = true;
        $('.compare-div').show();
    };

    /* 
       detects texts of image one 
       function not called from anywhere right now.
    */
    function detectTextOfImageOne(){
        var rekognition = new AWS.Rekognition(rekognitionCredentials);
        var params = {
            Image: { /* required */
                S3Object: {
                    Bucket: bucketName, 
                    Name: imageOne
                }
            }
        };
        rekognition.detectText(params, function(err, data) {
            if(err){
                console.log(err, err.stack); // an error occurred
            }
            else{
                console.log(data.TextDetections) // successful response of text data
                var parsedString = data.TextDetections[4].DetectedText.split(" ");
                var dateOfBirth = parsedString[1];
                var birthPlace = parsedString[2];
                console.log('1: Date of Birth is:>'+dateOfBirth + '  2: Birth place is:>' +birthPlace);
            }     
        });
    }

    /* random key generator for image */
    function imageKeyGenerator(){
        var imageKey = "";
        var length = 12;
        var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
        for(var i=0; i < length; i++)
            imageKey += charset.charAt(Math.floor(Math.random() * charset.length));
        return imageKey;
    };

    /* detect labels of image one */
    /* For future reference. This function is not in use right now  */
    /* 
    function detectImageOneLabels(){
        var rekognition = new AWS.Rekognition(rekognitionCredentials);
        var params = {
            Image: {
                S3Object: {
                    Bucket: bucketName, 
                    Name: imageOne // either imageOne or imageTwo
                }
            },
            MaxLabels: 123, 
            MinConfidence: 70
        };
        rekognition.detectLabels(params,function(err,data) {
            if(err){
                console.log(err,err.stack); // an error occurred
            } 
            else{
                console.log(data); // successful response
            }     
        }); 
    };
    */ 
   
}); // document ready function ends