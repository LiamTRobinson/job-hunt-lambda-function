var http = require('http');
var aws = require('aws-sdk');
var https = require('https');

var ses = new aws.SES({apiVersion: '2010-12-01'});


exports.handler = (event, context, callback) => {
    try { 
        if (event.session.new) {
            if (event.session.user.accessToken === undefined) {
                context.succeed(buildSpeechletResponseWithCard());
                return;
            }
        } 
        
        switch(event.request.type) {
            case "LaunchRequest" :
                context.succeed(
                    generateResponse(
                        buildSpeechletResponse("This is working", true), 
                        {}
                    )
                );
                break;
                
                case "IntentRequest":
                    switch(event.request.intent.name) {
                        
                        case "AMAZON.NextIntent":
                            var sessionAttributes = event.session.attributes;
                            sessionAttributes.currentIndex += 1;
                            context.succeed(
                                 generateResponse(
                                 buildSpeechletResponse(`the next job is ${sessionAttributes.results[sessionAttributes.currentIndex].jobtitle} with ${sessionAttributes.results[sessionAttributes.currentIndex].company}, save it or next it.`, false), sessionAttributes)
                                 );
                        break;
                
                        case "FindJobsOfType":
                            var endpoint = `http://api.indeed.com/ads/apisearch?publisher=4713196896940131&q=${event.request.intent.slots.JobType.value}&l=atlanta%2C+ga&sort=date&radius=25&format=json&callback=&st=&jt=fulltime&start=&limit=&fromage=3&filter=&latlong=0&co=us&userip=1.2.3.4&useragent=Mozilla/%2F4.0%28Firefox%29&v=2&chnl=newchannelname`;
                            var body = "";
                            http.get(endpoint, (response) => {
                                response.on('data', (chunk) => {
                                    body += chunk;
                                });
                                response.on('end', () => {
                                    var data = JSON.parse(body);
                                    var results = data.results;
                                    if (!event.session.attributes) {
                                        var sessionAttributes = {savedJobs: []};
                                    }else{
                                        var sessionAttributes = event.session.attributes;
                                    }
                                    sessionAttributes.results = results;
                                    sessionAttributes.currentIndex = 0;
                                    context.succeed(
                                        generateResponse(
                                             buildSpeechletResponse(`the first job is ${results[0].jobtitle} with ${results[0].company}, save it or next it.`, false), sessionAttributes)
                                            );
                                });
                            });
                        break;
                        
                        case "AMAZON.StopIntent" :
                            context.succeed(
                                 generateResponse(
                                 buildSpeechletResponse(`Good Bye`, true), {})
                                 );
                        break;
                
                        case "AMAZON.CancelIntent" :
                            context.succeed(
                                 generateResponse(
                                 buildSpeechletResponse(`Good Bye`, true), {})
                                 );
                        break;
                        
                        case "SaveTheCurrentIndexedJob":
                            var sessionAttributes = event.session.attributes;
                            sessionAttributes.savedJobs.push(sessionAttributes.results[sessionAttributes.currentIndex].company);
                            sessionAttributes.savedJobs.push(sessionAttributes.results[sessionAttributes.currentIndex].jobtitle);
                            sessionAttributes.savedJobs.push(sessionAttributes.results[sessionAttributes.currentIndex].url);
                            context.succeed(
                                generateResponse(
                                    buildSpeechletResponse(`${sessionAttributes.results[sessionAttributes.currentIndex].jobtitle} is added to your job list. they'll be lucky to have you. what now?`, false), sessionAttributes)
                            );
                        break;
                        
                        case "GetMeReallyHypedForJobHunting":
                            var phrases = [
                                "The future belongs to those who believe in the beauty of their dreams.",
                                "You found out what you like doing best and someone will pay you for doing it.",
                                "One important key to success is self-confidence. An important key to self-confidence is preparation.",
                                "Take risks: if you win, you will be happy; if you lose, you will be wise.",
                                "Opportunities don't often come along. So, when they do, you have to grab them.",
                                "Choose a job you love, and you will never have to work a day in your life.",
                                "I'd hire you.",
                                "i just met you. and this is crazy. but here's an offer. so work here maybe.",
                                "pump up the job, pump it up, time to get the career started.",
                                "To be a great candidate, you must believe you are the best. That shouldn't be hard."
                                ];
                            var index = Math.floor(Math.random() * 10);
                            if (!event.session.attributes) {
                                var sessionAttributes = {savedJobs: []};
                            }else{
                                var sessionAttributes = event.session.attributes;
                            }
                            context.succeed(
                                generateResponse(
                                    buildSpeechletResponse(`${phrases[index]} `, false), 
                                    sessionAttributes
                                )
                            );
                        break;
                        
                        case "ReadASampleFromTheListOfGeneralInterviewQuestions":
                            var questions = [
                                "What made you interested in working here",
                                "What do you like to do in your spare time",
                                "How did you hear about us",
                                "What is your strongest skill in this industry",
                                "What would you consider to be your weaknesses",
                                "Describe a time you worked with a team",
                                "Do you have any questions for me",
                                "Where do you see yourself in five years",
                                "Tell me a little about yourself",
                                "Why do you want this job",
                                "how did you hear about the position",
                                "why should we hire you",
                                "what is your greatest achievement so far in this industry",
                                "tell me about a challenge you have faced in this industry and how you dealt with it",
                                "what's your dream job",
                                "what are you looking for in this position",
                                "what type of work environment do you prefer",
                                "explain a time you have exercised leadership",
                                "explain a time you have disagreed with a decision in this field",
                                "how would your peers describe you",
                                "how do you deal with stressful situations",
                                "what do you think your first 30 days would look like in this role",
                                "what are your salary requirements"
                                ];
                            var index = Math.floor(Math.random() * 23);
                            context.succeed(
                                generateResponse(
                                    buildSpeechletResponse(`${questions[index]}`, true), 
                                    {}
                                )
                            );
                        break;
                        
                        case "EmailTheJobListAsItCurrentlyIs":
                            var sessionAttributes = event.session.attributes;
                            var len = sessionAttributes.savedJobs.length;
                            var messageBdy = '';
                            for(let i = 0; i < len; i++){
                                messageBdy = messageBdy + sessionAttributes.savedJobs[i] + "\n";
                            }
                            var profile_url = `https://api.amazon.com/user/profile?access_token=${event.session.user.accessToken}`;
                            var body = "";
                            https.get(profile_url, (response) => {
                                response.on('data', (chunk) => {
                                    body += chunk;
                                });
                                response.on('end', () => {
                                    var email = JSON.parse(body).email;
                                    ses.sendEmail( {
                                        Source: email,
                                        Destination: {ToAddresses: [email]},
                                        Message: {
                                            Subject: {
                                                Data: "Jobs That Want You!"
                                            },
                                            Body: {
                                                Text: {
                                                    Data: messageBdy
                                                }
                                            }
                                        }
                                    },
                                    function(err, data) {
                                        if(err) { 
                                            console.log(err) 
                                        }else{
                                            context.succeed(
                                                generateResponse(
                                                    buildSpeechletResponse(`Job list successfully Emailed, happy hunting!`, true), 
                                                    {}
                                                )
                                            );
                                        }
                                    });
                                });
                            })
                            
                            
                        break;
                    }
                break;
                
                
            case "SessionEndedRequest":
                break;

            default:
                context.fail(`INVALID REQUEST TYPE: ${event.request.type}`);
        }
    }
    catch(error) { context.fail(`Exception: ${error}`) }
    
};

buildSpeechletResponse = (outputText, shouldEndSession) => {

  return {
    outputSpeech: {
      type: "PlainText",
      text: outputText
    },
    shouldEndSession: shouldEndSession
  };
};

buildSpeechletResponseWithCard = () => {
    return {
        version: "1.0",

         response: {

        outputSpeech: {

        type: "PlainText",

        text: " Please use the companion app to authenticate on Amazon to start using this skill"

    },
    card: {

      type: "LinkAccount"

    },

    shouldEndSession: true

  },

  sessionAttributes: {}

    }
}


generateResponse = (speechletResponse, sessionAttributes) => {

  return {
    version: "1.0",
    sessionAttributes: sessionAttributes,
    response: speechletResponse
  };
};
