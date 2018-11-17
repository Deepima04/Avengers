const Alexa = require('ask-sdk');
const standardSkillBuilder = Alexa.SkillBuilders.standard();

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        let speechText = ``;
        let sessionEnd = false;
        if (attributes && attributes.FirstTime) {
            if (attributes.TotalLetters == 2) {
                speechText += `It's Monday. Let me sort out the letters for delivery today. Hurry, there are just two letters to be delivered. First letter to Door one and Second letter to Door two. `;
                sessionEnd = false;
            }
            else if (attributes.TotalLetters == 1) {
                speechText += `It's Monday. Let me sort out the letters for delivery today. there were just two letters to be delivered. One letter has been alotted and I have one more letter for Door two. `
                sessionEnd = false;
            }
            else if (attributes.TotalLetters == 0 && attributes.IronMan.status == false && attributes.SpiderMan.status == false) {
                speechText += `The letters are already been alloted to Avengers. So, if you have delivered the letters please tell me your letter number along with your name. `
                sessionEnd = false;
            }
            else if (attributes.TotalLetters == 0 && attributes.IronMan.status == false && attributes.SpiderMan.status == true) {
                speechText += `Spider Man has delivered the letter! while there is no update for Iron man's delivery. `
                sessionEnd = false;
            }
            else if (attributes.TotalLetters == 0 && attributes.IronMan.status == true && attributes.SpiderMan.status == false) {
                speechText += `Iron Man has delivered the letter! while there is no update for Spider man's delivery. `
                sessionEnd = false;
            }
            else if (attributes.TotalLetters == 0 && attributes.IronMan.status == true && attributes.SpiderMan.status == true) {
                speechText += `I have no more letters for the day to be delivered. Enjoy your evening. Goodbye! `
                sessionEnd = true;
            } else {
                speechText += `Sorry, I didn't get you. Please say again? `
                sessionEnd = false;
            }
        } else {
            attributes.FirstTime = true; //first time
            attributes.TotalLetters = 2;
            speechText += `It's Monday. Let me sort out the letters for delivery today. Hurry, there are just two letters to be delivered. First letter to Door one and Second letter to Door two. `
            sessionEnd = false;
        }
        attributesManager.setSessionAttributes(attributes); //session attributes
        attributesManager.setPersistentAttributes(attributes); //persistance attributes
        await attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withShouldEndSession(sessionEnd)
            .getResponse();
    }
};

const InProgressJobHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "JobIntent" &&
            handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        let prompt = '';

        for (const slotName in currentIntent.slots) {
            if (Object.prototype.hasOwnProperty.call(currentIntent.slots, slotName)) {
                const currentSlot = currentIntent.slots[slotName];
                if (currentSlot.confirmationStatus !== 'CONFIRMED'
                    && currentSlot.resolutions
                    && currentSlot.resolutions.resolutionsPerAuthority[0]) {
                    if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
                        if (currentSlot.resolutions.resolutionsPerAuthority[0].values.length > 1) {
                            prompt = 'Please specify one of them ';
                            const size = currentSlot.resolutions.resolutionsPerAuthority[0].values.length;

                            currentSlot.resolutions.resolutionsPerAuthority[0].values
                                .forEach((element, index) => {
                                    prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
                                });

                            prompt += '?';

                            return handlerInput.responseBuilder
                                .speak(prompt)
                                .reprompt(prompt)
                                .addElicitSlotDirective(currentSlot.name)
                                .getResponse();
                        }
                    } else if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
                        if (requiredSlots.indexOf(currentSlot.name) > -1) {
                            prompt = `What ${currentSlot.name} are you looking for`;

                            return handlerInput.responseBuilder
                                .speak(prompt)
                                .reprompt(prompt)
                                .addElicitSlotDirective(currentSlot.name)
                                .getResponse();
                        }
                    }
                }
            }
        }
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    }
};

const JobHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "JobIntent" &&
            handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        const attributesManager = handlerInput.attributesManager;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const sessionAttribute = attributesManager.getSessionAttributes();
        let speechText = ``;

        if (request.intent.slots.Name
            && request.intent.slots.Name.resolutions
            && request.intent.slots.Name.resolutions.resolutionsPerAuthority[0]
            && request.intent.slots.Name.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH'
            && request.intent.slots.Name.value !== "?" && request.intent.slots.Name.value) {
            let name = request.intent.slots.Name.resolutions.resolutionsPerAuthority[0].values[0].value.name;
            sessionAttribute.currentAvenger = name;
            if (attributes && attributes.FirstTime) {
                let TotalLetters = attributes.TotalLetters; // total letter

                if (name == "Iron Man" && attributes.IronMan) {
                    if (attributes.IronMan.status == true) {
                        speechText += `You were alotted the letter one and you have successfully delivered it.`
                    } else {
                        speechText += `You were alotted the letter one and you haven't delivered it. If you have delivered, please say I have delivered letter one. `
                    }
                } else if (name == "Iron Man") {
                    attributes.IronMan = {};
                    attributes.IronMan.Alotted = true;
                    attributes.IronMan.status = false;
                    attributes.IronMan.Letter = "Letter One";
                    attributes.IronMan.Address = "Door One";
                    TotalLetters--;
                    attributes.TotalLetters = TotalLetters;
                    speechText += `I've just one letter to be delivered to Door One. After delivering the letter, Just say letter one delivered along with your name. `
                }

                else if (name == "Spider Man" && attributes.SpiderMan) {
                    if (attributes.SpiderMan.status == true) {
                        speechText += `Hey! Spider Man! You were alotted the letter two and you have already delivered it.`
                    } else {
                        speechText += `Hey! Spider Man! You were alotted the letter two and you haven't delivered it. If you have delivered, please say I have delivered letter two. `
                    }
                }
                else if (name == "Spider Man") {
                    attributes.SpiderMan = {};
                    attributes.SpiderMan.Alotted = true;
                    attributes.SpiderMan.status = false;
                    attributes.SpiderMan.Letter = "Letter Two";
                    attributes.SpiderMan.Address = "Door Two";
                    TotalLetters--;
                    attributes.TotalLetters = TotalLetters;
                    speechText += `You need to deliver letter 2 to Door two. After delivering the letter, Just say letter two delivered along with your name. `
                }

                else { speechText += `Sorry! I didn't get you? Please say again? ` };
            }
            else {
                // first time
                // "Alexa, tell post office my name is Iron Man, what's my job for today?"
                if (name == "Iron Man") {
                    attributes.FirstTime = true;
                    attributes.TotalLetters = 1;
                    attributes.IronMan.Alotted = true;
                    attributes.IronMan.status = false;
                    attributes.IronMan.Letter = "Letter One";
                    attributes.IronMan.Address = "Door One";
                    speechText += `I've just one letter to be delivered to Door One. After delivering the letter, Just say letter one delivered`

                } else if (name == "Spider Man") {
                    attributes.FirstTime = true;
                    attributes.TotalLetters = 1;
                    attributes.SpiderMan.Alotted = true;
                    attributes.SpiderMan.status = false;
                    attributes.SpiderMan.Letter = "Letter Two";
                    attributes.SpiderMan.Address = "Door Two";
                    speechText += `You need to deliver letter 2 to Door two. After delivering the letter, Just say letter two delivered`

                } else {
                    speechText += `Sorry, I didn't get you! Can you please tell me the name again?`;
                }
            }
        } else {
            speechText += `Sorry I didn't get your name. Can you please repeat again?`
        }
        handlerInput.attributesManager.setSessionAttributes(sessionAttribute);
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        await handlerInput.attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }

};

const InProgressDeliveredHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "DeliverIntent" &&
            handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        const request = handlerInput.requestEnvelope.request;
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        let prompt = '';
        for (const slotName in currentIntent.slots) {
            if (Object.prototype.hasOwnProperty.call(currentIntent.slots, slotName)) {
                const currentSlot = currentIntent.slots[slotName];
                if (currentSlot.confirmationStatus !== 'CONFIRMED'
                    && currentSlot.resolutions
                    && currentSlot.resolutions.resolutionsPerAuthority[0]) {
                    if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
                        if (currentSlot.resolutions.resolutionsPerAuthority[0].values.length > 1) {
                            prompt = 'Please specify one of them ';
                            const size = currentSlot.resolutions.resolutionsPerAuthority[0].values.length;

                            currentSlot.resolutions.resolutionsPerAuthority[0].values
                                .forEach((element, index) => {
                                    prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
                                });

                            prompt += '?';

                            return handlerInput.responseBuilder
                                .speak(prompt)
                                .reprompt(prompt)
                                .addElicitSlotDirective(currentSlot.name)
                                .getResponse();
                        }
                    } else if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
                        if (requiredSlots.indexOf(currentSlot.name) > -1) {
                            prompt = `What ${currentSlot.name} are you looking for`;

                            return handlerInput.responseBuilder
                                .speak(prompt)
                                .reprompt(prompt)
                                .addElicitSlotDirective(currentSlot.name)
                                .getResponse();
                        }
                    }
                }
            }
        }
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    }
};

const DeliveredHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "DeliverIntent" &&
            handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const attributesManager = handlerInput.attributesManager;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const sessionAttribute = attributesManager.getSessionAttributes();
        let speechText = ``;
        let endSession = false;
        if (request.intent.slots.Name
            && request.intent.slots.Name.resolutions
            && request.intent.slots.Name.resolutions.resolutionsPerAuthority[0]
            && request.intent.slots.Name.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH'
            && request.intent.slots.Name.value !== "?" && request.intent.slots.Name.value) {
            let name = request.intent.slots.Name.resolutions.resolutionsPerAuthority[0].values[0].value.name;
            let number = request.intent.slots.Number.value;
            if (attributes && attributes.FirstTime) {
                if (name == "Iron Man" && attributes.IronMan) {
                    if (attributes.IronMan.status == true) {
                        speechText += `Hey! Iron Man! You were alotted the letter one and you have already delivered it.`
                    } else {
                        if (request.intent.slots.Number.value == 2) {
                            speechText += `Hey! Iron Man! You were alotted the letter one! You will have to say I delivered letter one along with your name`
                        }else {
                            attributes.IronMan.status = true;
                            speechText += `Great. Enjoy rest of your day!`
                            endSession = true;
                        }
                    }
                } else if (name == "Iron Man") {
                    speechText += `Sorry! Iron Man you haven't been assigned any letter yet! Please ask for your job along with your name! `
                } else if (name == "Spider Man" && attributes.SpiderMan) {
                    if (attributes.SpiderMan.status == true) {
                        speechText += `Hey! Spider Man! You were alotted the letter two and you have already delivered it.`
                    } else {
                        if (request.intent.slots.Number.value == "1") {
                            speechText += `Hey! Spider Man! You were alotted the letter two! You will have to say I delivered letter two along with your name`

                        } else {
                            attributes.SpiderMan.status = true;
                            speechText += `Wonderful. Enjoy your rest of the evening. `
                            endSession = true;
                        }
                    }
                } else if (name == "Spider Man") {
                    speechText += `Sorry! Spider Man you haven't been assigned any letter yet! Please ask for your job along with your name! `

                } else {
                    speechText += `Sorry! I didn't get you? Please say again? `;
                }
            } else {
                //first time
                // "Alexa, tell avengers i am iron man and i have delivered"
                if (name == "Iron Man") {
                    speechText += `Sorry! Iron Man you haven't been assigned any letter yet! Please ask for your job along with your name! `
                } else if (name == "Spider Man") {
                    speechText += `Sorry! Spider Man you haven't been assigned any letter yet! Please ask for your job along with your name! `
                } else {
                    speechText += `Sorry, I didn't get you! Can you please tell me the name again?`;
                }
            }
        }
        else {
            speechText += `Sorry! I didn't get your name. Can you please repeat again?`
        }
        handlerInput.attributesManager.setSessionAttributes(sessionAttribute);
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        await handlerInput.attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withShouldEndSession(endSession)
            .getResponse();
    }
};

const YesHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent";
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const attributesManager = handlerInput.attributesManager;
        const sessionAttribute = attributesManager.getSessionAttributes();
        let speechText = ``;
        let endSession = false;
        if (sessionAttribute.currentAvenger) {
            speechText += `When you have delivered, just say I have delivered along with your name! `
            endSession = true;
        } else {
            speechText += `Sorry, I didn't get you. Please say again? `
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(endSession)
            .getResponse();
    }
}

const FallbackHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        console.log("FallBack")
        return handlerInput.responseBuilder
            .speak("Sorry I didn't get you, please say again?")
            .reprompt("Sorry I didn't get you, please say again?")
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = `I am Ultron, I had two letters to be delivered at the respective addresses. To get the job, please ask what's my job for today! and after delivering the letter, please say i have delivered!`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye! ';

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please say again.')
            .reprompt('Sorry, I can\'t understand the command. Please say again.')
            .getResponse();
    },
};

exports.handler = standardSkillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        InProgressJobHandler,
        JobHandler,
        InProgressDeliveredHandler,
        DeliveredHandler,
        YesHandler,
        FallbackHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        HelpIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withAutoCreateTable(true)
    .withTableName('Avengers')
    .lambda();