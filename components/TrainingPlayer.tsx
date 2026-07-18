
import React, { useState } from 'react';
import { InteractiveModule, QuizQuestion, WorkerData, CompanyProfile } from '../types';
import { CheckCircle2, XCircle, ArrowRight, Award, AlertTriangle, BookOpen, Save, ChevronRight, ChevronLeft, Info, Eye, Lock } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

interface Props {
  module: InteractiveModule;
  worker: WorkerData;
  company: CompanyProfile;
  onComplete: (signature: string, score: number, answers: number[]) => void;
  onCancel: () => void;
  mode?: 'EXECUTE' | 'PREVIEW';
}

export const TrainingPlayer: React.FC<Props> = ({ module, worker, company, onComplete, onCancel, mode = 'EXECUTE' }) => {
  const [step, setStep] = useState<'INTRO' | 'SLIDES' | 'INFOGRAPHIC' | 'QUIZ' | 'RESULT' | 'CERTIFICATE'>('INTRO');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [signature, setSignature] = useState('');
  const [password, setPassword] = useState(''); // New: Password

  if (!module || !Array.isArray(module.slides) || module.slides.length === 0) {
      return (
          <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-white p-8 rounded-2xl shadow-xl">
                  <AlertTriangle size={48} className="mx-auto text-red-500 mb-4"/>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Error de Contenido</h2>
                  <p className="text-gray-600 mb-6">El contenido de este curso no se pudo cargar correctamente o está incompleto.</p>
                  <button onClick={onCancel} className="bg-gray-800 text-white px-6 py-2 rounded-lg">Cerrar</button>
              </div>
          </div>
      );
  }

  const nextSlide = () => {
      const slides = module?.slides || [];
      if (currentSlideIndex < slides.length - 1) {
          setCurrentSlideIndex(prev => prev + 1);
      } else {
          setStep('INFOGRAPHIC');
      }
  };

  const prevSlide = () => {
      if (currentSlideIndex > 0) {
          setCurrentSlideIndex(prev => prev - 1);
      }
  };

  const handleStartQuiz = () => {
    if (!module.quiz || module.quiz.length === 0) {
        if (mode === 'PREVIEW') {
            alert("Modo Vista Previa: Fin del contenido (Sin Quiz).");
            return;
        }
        alert("Este módulo no tiene evaluación.");
        return;
    }
    setStep('QUIZ');
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...userAnswers, optionIndex];
    setUserAnswers(newAnswers);
    
    const quiz = module.quiz || [];

    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      let correctCount = 0;
      newAnswers.forEach((ans, idx) => {
        if (quiz[idx] && ans === quiz[idx].correctIndex) correctCount++;
      });
      const finalScore = Math.round((correctCount / (quiz.length || 1)) * 100);
      setScore(finalScore);
      setStep('RESULT');
    }
  };

  const handleRetry = () => {
    setStep('SLIDES');
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentSlideIndex(0);
  };

  const handleFinish = () => {
    if (mode === 'PREVIEW') {
        onCancel();
        return;
    }
    if (!signature) {
        alert("Por favor firme para generar su certificado.");
        return;
    }

    // Password Validation
    const cleanRut = (worker.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
    const storedPass = worker.password ? String(worker.password).trim() : "";
    const inputPass = password.trim();
    let isValid = false;
    
    if (storedPass) isValid = inputPass === storedPass;
    else isValid = inputPass === cleanRut || inputPass === worker.rut.trim();

    if (!isValid) {
        alert("Contraseña o PIN incorrecto. No se puede validar la firma.");
        return;
    }

    onComplete(signature, score, userAnswers);
  };

  const currentSlide = module?.slides?.[currentSlideIndex];
  const currentQuestion = module?.quiz?.[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col overflow-hidden">
      <div className={`${mode === 'PREVIEW' ? 'bg-orange-50 border-orange-200' : 'bg-white'} px-6 py-4 border-b flex justify-between items-center shadow-sm z-10`}>
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {mode === 'PREVIEW' ? <Eye className="text-orange-500"/> : <BookOpen className="text-primary"/>} 
              {mode === 'PREVIEW' ? 'VISTA PREVIA (ADMINISTRADOR)' : 'Aula Virtual SST'}
          </h2>
          <p className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-md">{module.title}</p>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full">
            <XCircle size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full bg-slate-50">
        
        {step === 'INTRO' && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-inner">
                    <BookOpen size={40} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-4">{module.title}</h1>
                <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                  {module.introduction || `Bienvenido, ${worker.fullName}. Esta capacitación es clave para tu seguridad.`}
                </p>
                <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 mb-6">
                    <p className="font-bold mb-1">Estructura del Curso:</p>
                    <ul className="list-disc list-inside text-left">
                        <li>Conceptos Generales</li>
                        <li>Riesgos Específicos del Cargo</li>
                        <li>Medidas de Control</li>
                        <li>Evaluación Final</li>
                    </ul>
                </div>
                <button onClick={() => setStep('SLIDES')} className="w-full bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-transform active:scale-95">
                    Comenzar <ArrowRight />
                </button>
            </div>
          </div>
        )}

        {step === 'SLIDES' && currentSlide && (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
             <div className="w-full max-w-2xl relative">
                 <div className="absolute -top-10 left-0 right-0 flex gap-1 h-1.5 mb-4">
                     {(module.slides || []).map((_, idx) => (
                         <div key={idx} className={`flex-1 rounded-full transition-all ${idx <= currentSlideIndex ? 'bg-blue-500' : 'bg-gray-300'}`} />
                     ))}
                 </div>

                 <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row min-h-[450px]">
                     <div className="md:w-1/2 bg-slate-100 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100">
                         {currentSlide.visualContent ? (
                             <div className="w-full h-full max-h-[300px] flex items-center justify-center" dangerouslySetInnerHTML={{ __html: currentSlide.visualContent }} />
                         ) : (
                             <div className="text-8xl animate-bounce-in">{currentSlide.emoji}</div>
                         )}
                     </div>

                     <div className="md:w-1/2 p-8 flex flex-col justify-center">
                         <div className="flex items-center gap-2 mb-4">
                             <span className="text-3xl">{currentSlide.emoji}</span>
                             <h3 className="text-xl font-bold text-gray-800 leading-tight">{currentSlide.title}</h3>
                         </div>
                         <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                             {currentSlide.content}
                         </div>
                     </div>
                 </div>

                 <div className="flex justify-between mt-8">
                     <button 
                        onClick={prevSlide} 
                        disabled={currentSlideIndex === 0}
                        className="bg-white text-gray-600 p-4 rounded-full shadow-lg disabled:opacity-30 hover:bg-gray-50"
                     >
                         <ChevronLeft size={24} />
                     </button>
                     <button 
                        onClick={nextSlide}
                        className="bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg font-bold hover:bg-blue-700 flex items-center gap-2 transition-all"
                     >
                         {currentSlideIndex === (module.slides || []).length - 1 ? "Ver Resumen" : "Siguiente"} <ChevronRight size={20}/>
                     </button>
                 </div>
                 
                 <div className="text-center mt-4 text-xs text-gray-400">
                     Diapositiva {currentSlideIndex + 1} de {(module.slides || []).length}
                 </div>
             </div>
          </div>
        )}

        {step === 'INFOGRAPHIC' && (
            <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-center mb-8 flex items-center justify-center gap-2 text-gray-800">
                        <Info className="text-purple-500"/> Resumen Visual
                    </h3>
                    <div className="relative border-l-4 border-purple-100 ml-4 space-y-8 pl-8 py-2">
                        {(module.infographic || []).map((stepItem, idx) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[42px] top-0 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                                    {stepItem.step}
                                </div>
                                <h4 className="font-bold text-gray-800 text-lg">{stepItem.title}</h4>
                                <p className="text-gray-600 text-sm">{stepItem.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-10 pt-6 border-t text-center">
                        <button onClick={handleStartQuiz} className="w-full bg-green-600 text-white px-6 py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 text-lg animate-pulse">
                            <CheckCircle2 /> {mode === 'PREVIEW' ? 'Ver Preguntas del Quiz' : 'Realizar Evaluación Final'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {step === 'QUIZ' && currentQuestion && (
           <div className="flex flex-col items-center justify-center h-full animate-fade-in">
               <div className="bg-white p-8 rounded-3xl shadow-xl max-w-xl w-full border border-gray-100">
                  <div className="mb-6 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Pregunta {currentQuestionIndex + 1} / {(module.quiz || []).length}
                          {mode === 'PREVIEW' && <span className="text-orange-500 ml-2">(VISTA PREVIA)</span>}
                      </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-8 leading-snug">{currentQuestion.question}</h3>
                  
                  <div className="space-y-3">
                      {(currentQuestion.options || []).map((option, idx) => {
                          const isCorrect = idx === currentQuestion.correctIndex;
                          const previewClass = mode === 'PREVIEW' && isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-blue-500 hover:bg-blue-50';
                          
                          return (
                              <button 
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full text-left p-5 rounded-xl border-2 transition-all font-medium text-gray-700 flex items-center gap-3 group ${previewClass}`}
                              >
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${mode === 'PREVIEW' && isCorrect ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-500'}`}>
                                      {String.fromCharCode(65 + idx)}
                                  </div>
                                  {option} {mode === 'PREVIEW' && isCorrect && <CheckCircle2 size={16} className="text-green-500 ml-auto"/>}
                              </button>
                          );
                      })}
                  </div>
               </div>
           </div>
        )}

        {step === 'RESULT' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
                    {mode === 'PREVIEW' ? (
                        <>
                            <div className="bg-orange-100 w-24 h-24 rounded-full text-orange-600 mb-6 flex items-center justify-center mx-auto">
                                <Eye size={48} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">Fin de la Vista Previa</h1>
                            <p className="text-gray-600 mb-6">El contenido se ha revisado correctamente. El trabajador verá este mismo flujo y deberá aprobar con 75%.</p>
                            <button onClick={onCancel} className="w-full bg-gray-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-gray-900">
                                Cerrar Vista Previa
                            </button>
                        </>
                    ) : (
                        <>
                            {score >= 75 ? (
                                <>
                                    <div className="bg-green-100 w-24 h-24 rounded-full text-green-600 mb-6 flex items-center justify-center mx-auto animate-bounce-in">
                                        <Award size={48} />
                                    </div>
                                    <h1 className="text-3xl font-bold text-green-700 mb-2">¡Felicitaciones!</h1>
                                    <p className="text-gray-600 mb-6">Has aprobado el curso con un <span className="font-bold text-green-600 text-xl">{score}%</span>.</p>
                                    <button onClick={() => setStep('CERTIFICATE')} className="w-full bg-green-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-green-700">
                                        Generar Certificado
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="bg-red-100 w-24 h-24 rounded-full text-red-600 mb-6 flex items-center justify-center mx-auto">
                                        <AlertTriangle size={48} />
                                    </div>
                                    <h1 className="text-3xl font-bold text-red-700 mb-2">No Aprobado</h1>
                                    <p className="text-gray-600 mb-6">Tu nota: <span className="font-bold text-red-600 text-xl">{score}%</span>. El mínimo es 75%.</p>
                                    <button onClick={handleRetry} className="w-full bg-gray-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-gray-900">
                                        Intentar de Nuevo
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {step === 'CERTIFICATE' && mode !== 'PREVIEW' && (
             <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg mx-auto animate-fade-in text-center border border-gray-200">
                 <div className="border-4 border-double border-gray-200 p-6 rounded-2xl">
                     <Award size={48} className="text-yellow-500 mx-auto mb-4"/>
                     <h2 className="text-2xl font-bold text-gray-800 mb-2 font-serif">Certificado de Aprobación</h2>
                     <p className="text-sm text-gray-500 mb-8 italic">
                         Certifico que he completado y aprobado la capacitación <strong>"{module.title}"</strong> cumpliendo con la normativa interna de SST.
                     </p>
                     
                     <div className="mb-4 bg-gray-50 rounded-xl p-4">
                         {signature ? (
                             <div className="relative group">
                                <img src={signature} alt="Firma" className="h-16 mx-auto"/>
                                <button onClick={() => setSignature('')} className="text-xs text-red-500 underline mt-2">Borrar firma</button>
                             </div>
                         ) : (
                             <SignaturePad onSave={setSignature} label="Firme aquí para validar" />
                         )}
                     </div>

                     <div className="mb-6 text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Lock size={12}/> Contraseña (Confirmar Identidad)
                        </label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-center font-bold tracking-widest bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                            placeholder="****"
                        />
                     </div>

                     <button 
                        onClick={handleFinish}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex justify-center items-center gap-2"
                     >
                         <Save size={20}/> Guardar y Finalizar
                     </button>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};
