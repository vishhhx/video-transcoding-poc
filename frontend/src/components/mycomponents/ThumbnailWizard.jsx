import React, { useState } from "react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { HiCheckCircle, HiArrowRight, HiArrowLeft } from "react-icons/hi";

function ThumbnailWizard({ onFinish, isCompelted }) {
  const steps = [
    {
      question: "Do you want text in your YouTube thumbnail?",
      options: ["Yes", "No", "Leave blank / Skip"],
    },
    {
      question: "What should be the main focus of your thumbnail?",
      options: [
        "Close-up Face / Reaction",
        "Action Scene from Video",
        "Product / Object Highlight",
        "Custom Illustration / Graphic",
        "Leave blank / Skip",
      ],
    },
    {
      question: "What's the primary purpose of your thumbnail?",
      options: [
        "Grab Attention (Clickbait style)",
        "Show Before & After",
        "Explain / Tutorial",
        "Comparison (vs. style)",
        "Entertainment / Fun",
        "Leave blank / Skip",
      ],
    },
    {
      question: "What type of YouTube content do you usually create?",
      options: [
        "Vlogs",
        "Gaming",
        "Tech Reviews",
        "Music / Entertainment",
        "Educational / Tutorials",
        "Lifestyle",
        "Leave blank / Skip",
      ],
    },
    {
      question: "What color theme works best for your channel?",
      options: [
        "Bright & Bold",
        "Dark & Moody",
        "Minimal & Clean",
        "Pastel",
        "Leave blank / Skip",
      ],
    },
    {
      question: "What kind of tone should the thumbnail convey?",
      options: [
        "Funny / Light",
        "Serious / Informative",
        "Exciting / Energetic",
        "Inspiring / Motivational",
        "Leave blank / Skip",
      ],
    },
    {
      question: "Do you want call-to-action text in the thumbnail?",
      options: [
        "Yes - Strong (e.g., 'Watch Now!')",
        "Yes - Subtle (e.g., 'Tutorial')",
        "No text, only visuals",
        "Leave blank / Skip",
      ],
    },
    {
      question: "What text style fits your YouTube brand?",
      options: [
        "Bold & Large",
        "Minimal & Clean",
        "Handwritten / Creative",
        "Retro / Funky",
        "Leave blank / Skip",
      ],
    },
  ];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentStep = steps[step];

  const handleNextStep = () => {
    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      if (onFinish) onFinish(answers);
    }
  };
  const handlePrevStep = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };
  const handleSelect = (option) => {
    setAnswers((prev) => ({
      ...prev,
      [currentStep.question]: option,
    }));
  };
  if (isCompelted) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50  rounded-xl border p-10 space-y-4">
        <HiCheckCircle className="size-12 text-green-500" />
        <h2 className="text-xl font-bold text-green-600">
          Completed Successfully!
        </h2>
        <p className="text-gray-600">
          Your thumbnail preferences have been saved.
        </p>
      </div>
    );
  }

  return (
    <div className=" bg-gray-50 rounded-xl border  w-full p-6 space-y-6 mx-auto">
      <div className="sticky top-0 bg-white py-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-medium text-gray-600">
            Step {step + 1} of {steps.length}
          </h2>
          <span className="text-xs text-gray-400">
            {Math.round(((step + 1) / steps.length) * 100)}% Complete
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {currentStep.question}
        </h3>
      </div>

      {/* Options Grid */}
      <RadioGroup
        value={answers[currentStep.question] || ""}
        onValueChange={handleSelect}
        className="grid grid-cols-2 gap-4"
      >
        {currentStep.options.map((option, i) => {
          const isSelected = answers[currentStep.question] === option;

          return (
            <div
              key={i}
              onClick={() => handleSelect(option)}
              className={`flex items-center space-x-2 p-4 border rounded-lg cursor-pointer transition ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {/* Keep radio input accessible */}
              <RadioGroupItem value={option} id={option} className="sr-only" />

              {isSelected ? (
                <HiCheckCircle className="w-5 h-5 text-blue-500" />
              ) : (
                <div className="w-5 h-5 border rounded-full border-gray-300" />
              )}

              <Label
                htmlFor={option}
                className="cursor-pointer flex-1 text-gray-800"
              >
                {option}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t ">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={step === 0}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium border ${
            step === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Previous
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition"
        >
          {step === steps.length - 1 ? "Finish" : "Next"}
          <HiArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

export default ThumbnailWizard;
