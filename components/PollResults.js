export default function PollResults({ results, currentPoll, studentAnswer }) {
  const { answers, totalResponses } = results

  const getPercentage = (count) => {
    return totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
  }

  const isStudentCorrect = studentAnswer === currentPoll?.correctAnswer

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">Poll Results</h2>
          
          {/* Student feedback */}
          {studentAnswer && currentPoll?.correctAnswer && (
            <div className={`p-4 rounded-lg mb-6 text-center ${
              isStudentCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-2 ${isStudentCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isStudentCorrect ? '🎉 Correct! Well done!' : '❌ Incorrect'}
              </h3>
              <p className="text-sm text-gray-600">
                Your answer: <span className="font-medium">{studentAnswer}</span> | 
                Correct answer: <span className="font-medium text-green-600">{currentPoll.correctAnswer}</span>
              </p>
            </div>
          )}

          {/* Question */}
          <div className="bg-gray-800 text-white p-4 rounded-lg mb-6">
            <h3 className="text-lg">{currentPoll?.question}</h3>
          </div>
          
          {totalResponses > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4 text-center">
                Total responses: {totalResponses}
              </p>
              
              {Object.entries(answers).map(([option, count]) => {
                const percentage = getPercentage(count)
                const isCorrect = option === currentPoll?.correctAnswer
                
                return (
                  <div key={option} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700">{option}</span>
                        {isCorrect && (
                          <span className="text-green-600 text-sm font-medium">✓ Correct</span>
                        )}
                      </div>
                      <span className="text-lg font-bold text-gray-800">
                        {percentage}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-1000 ${
                          isCorrect ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No responses yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
