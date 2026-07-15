import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fireBaseDb, generateContentResilient } from './../../../../config/FirebaseConfig';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import SliderStyle from '../../../components/custom/SliderStyle';
import OutlineSection from '../../../components/custom/OutlineSection';
import { Button } from '../../../components/ui/button';
import { ArrowRight, Loader2Icon } from 'lucide-react';
import { UserDetailContext } from '../../../../context/UserDetailContext';
import CreditLimitDialog from '@/components/custom/CreditLimitDialog';
import { useAuth } from '@clerk/react';

const OUTLINE_PROMPT=`
Generate a PowerPoint slide outline for the topic {userInput}.AI Agents and Agentic AI". Create {noOfSliders} slides in total. Each slide should include a topic name and a 2-line descriptive outline that clearly explains what content the slide will cover.
Include the following structure:
The first slide should be a Welcome screen.
The second slide should be an Agenda screen.
The final slide should be a Thank You screen.
Return the response only in JSON format, following this schema:
[
 {
 "slideNo": "",
 "slidePoint": "",
 "outline": ""
 }
]`

const DUMMY_OUTLINE=
[
  {
    "slideNo": "1",
    "slidePoint": "Welcome: The Dawn of Agentic AI",
    "outline": "Welcome to our deep dive into the next paradigm shift of artificial intelligence: AI Agents.\nThis session introduces how we are moving from passive text generation to active, goal-oriented autonomy."
  },
  {
    "slideNo": "2",
    "slidePoint": "Agenda: Navigating the Agentic Landscape",
    "outline": "An overview of today's topics, spanning basic definitions, core architectures, and multi-agent coordination.\nWe will also explore framework choices, real-world industry use cases, security guardrails, and future trends."
  },
  {
    "slideNo": "3",
    "slidePoint": "What is an AI Agent?",
    "outline": "Define AI Agents as autonomous software entities capable of perceiving environments, making decisions, and taking actions.\nUnderstand the key shift from prompt-based static query models to continuous loop-based execution engines."
  },
  {
    "slideNo": "4",
    "slidePoint": "Generative AI vs. Agentic AI",
    "outline": "Contrast traditional GenAI systems that rely on constant human prompt engineering with Agentic AI systems.\nLearn how agentic workflows reduce human friction by generating their own intermediate steps to solve complex goals."
  },
  {
    "slideNo": "5",
    "slidePoint": "Core Characteristics of Agentic Systems",
    "outline": "Explore the foundational pillars of agentic behavior: autonomy, goal-directedness, reactivity, and proactiveness.\nAnalyze how these traits allow agents to dynamically adapt to unexpected changes in their operating environment."
  },
  {
    "slideNo": "6",
    "slidePoint": "The Architectural Blueprint of an Agent",
    "outline": "Examine the technical components of an agent, including the core LLM engine, planning modules, and execution profiles.\nVisualize how sensory inputs are translated into structured thoughts, decisions, and physical or digital actions."
  },
  {
    "slideNo": "7",
    "slidePoint": "Memory Systems: Short-Term vs. Long-Term",
    "outline": "Analyze how agents utilize context windows as short-term memory to handle current conversations and tasks.\nUnderstand the role of vector databases and external semantic storage for persistent, long-term memory recall."
  },
  {
    "slideNo": "8",
    "slidePoint": "Tool Integration and Function Calling",
    "outline": "Discover how agents expand their capabilities by calling external tools like APIs, calculators, and web search engines.\nLearn the underlying mechanics of function calling, allowing agents to write and run code to solve problems."
  },
  {
    "slideNo": "9",
    "slidePoint": "Multi-Agent Systems (MAS) and Collaboration",
    "outline": "Explore the power of multiple specialized agents working together, communicating, and dividing complex tasks.\nExamine collaborative models such as hierarchical management, peer-to-peer voting, and debate-based refinement."
  },
  {
    "slideNo": "10",
    "slidePoint": "Use Cases: Enterprise & Customer Operations",
    "outline": "Review how companies deploy agents to autonomously resolve customer issues, process invoices, and manage operations.\nDiscover how enterprise agents dramatically lower costs while accelerating end-to-end task completion times."
  },
  {
    "slideNo": "11",
    "slidePoint": "Use Cases: Autonomous Software Engineering",
    "outline": "Investigate how coding agents write software, run tests, analyze debug logs, and self-correct syntax errors.\nSee how AI is shifting from a simple autocomplete coding assistant to an autonomous junior developer teammate."
  },
  {
    "slideNo": "12",
    "slidePoint": "Use Cases: Personal & Hyper-Personalized Assistants",
    "outline": "Understand consumer-facing agents that manage personal schedules, plan complex travel itineraries, and organize digital life.\nDiscuss how local data integration and user preferences enable deeply personalized agent behavior."
  },
  {
    "slideNo": "13",
    "slidePoint": "Leading Development Frameworks",
    "outline": "Compare the top tools developers use to build agentic applications, including AutoGen, CrewAI, and LangGraph.\nIdentify which frameworks are ideal for simple state machines versus highly dynamic, conversing multi-agent groups."
  },
  {
    "slideNo": "14",
    "slidePoint": "Challenges: Hallucinations and Loop Cascades",
    "outline": "Address major failure modes of agents, such as logic hallucination, API formatting errors, and infinite execution loops.\nLearn strategies to identify when agents deviate from their goals and how to set appropriate termination criteria."
  },
  {
    "slideNo": "15",
    "slidePoint": "Security, Permissions, and Safety Guardrails",
    "outline": "Analyze security threats like prompt injection, unauthorized tool execution, and data exfiltration in agent environments.\nEstablish structural sandboxes and input/output guardrails to guarantee secure, restricted execution boundaries."
  },
  {
    "slideNo": "16",
    "slidePoint": "The Human-in-the-Loop (HITL) Protocol",
    "outline": "Understand why critical and high-risk workflows require human approval steps before taking final actions.\nLearn how to architect clean interface check-points where agents request human feedback to resolve ambiguities."
  },
  {
    "slideNo": "17",
    "slidePoint": "Benchmarking and Performance Evaluation",
    "outline": "Explore how agentic performance is measured using automated benchmarks like SWE-bench and GAIA.\nLearn to track metrics such as task completion rates, execution times, token costs, and tool-calling accuracy."
  },
  {
    "slideNo": "18",
    "slidePoint": "Future Trends: Towards True Digital Teammates",
    "outline": "Preview upcoming breakthroughs in agentic AI, including multimodal inputs, spatial computing integration, and robotics.\nDiscuss the roadmap of how specialized digital agents will transform the future of human labor and business structures."
  },
  {
    "slideNo": "19",
    "slidePoint": "Key Takeaways and Summary",
    "outline": "Summarize the transformation from static text generators to proactive, tool-wielding, autonomous AI agents.\nHighlight the massive opportunities of agentic architectures paired with the necessity of robust security and testing."
  },
  {
    "slideNo": "20",
    "slidePoint": "Thank You: Q&A and Next Steps",
    "outline": "We appreciate your time and invite you to ask questions about building and deploying your own agentic systems.\nAccess our resource links, developer templates, and contact details to continue your AI engineering journey."
  }
]

export type Project={
    projectId:string;
    userInputPrompt:string;
    createdAt:number;
    noOfSliders:string;
    outline:Outline[];
    slides:any[];
    isSlidesGenerated?: number;
    designStyle:DesignStyle;
}

export type Outline = {
    slideNo: string;
    slidePoint: string;
    outline: string;
}

export type DesignStyle={
  colors:any;
  designGuide: string;
  styleName: string;
}



function Outline() {
    const {projectId}=useParams();
    const navigate = useNavigate();
    const [projectDetail,setProjectDetail]=useState<Project|null>();
    const {userDetail,setUserDetail} = useContext(UserDetailContext);
    const [loading,setLoading]=useState(false);
    const [UpdateDbLoading,setUpdateDbLoading]=useState(false);
    const [outline,setOutline]=useState<Outline[]>(DUMMY_OUTLINE);
    const [selectedStyle,setSelectedStyle]=useState<DesignStyle>();
    const [openAlert,setOpenAlert]=useState(false);
    const {has} = useAuth();
    const hasUnlimitedAccess = has&&has({ plan: 'unlimited' })

    useEffect(()=>{
       projectId && getProjectDetail();
    },[projectId]);



    const getProjectDetail=async()=>{
        const docRef=doc(fireBaseDb,'projects',projectId??'');
        const docSnap:any=await getDoc(docRef);
        if(!docSnap.exists())
            {
                console.log('No such document!');
                return;
            }
        console.log(docSnap.data());
        setProjectDetail(docSnap.data());
        if (docSnap.data()?.outline?.length) {
            setOutline(docSnap.data().outline);
        } else {
            GenerateSlidersOutline(docSnap.data());
        }
    }

    const GenerateSlidersOutline = async (projectData:Project) => {
        setLoading(true);
        // Provide a prompt that contains text
        const prompt = OUTLINE_PROMPT
        .replace('{userInput}', projectData?.userInputPrompt)
        .replace('{noOfSliders}', projectData?.noOfSliders);

        // To generate text output, call generateContent with the text input
        const result = await generateContentResilient(prompt);

        const response = result.response;
        const text = response.text();
        console.log(text);
        const rawJson=text.replace('```json','').replace('```','');
        const JSONData=JSON.parse(rawJson);
        setOutline(JSONData);
        setLoading(false);
    }

    const handleUpdateOutline = async (index: string, value: Outline) => {
        const slideIndex = outline.findIndex((item) => item.slideNo === index);
        const updatedOutline = outline.map((item) =>
            item.slideNo === index ? { ...item, ...value } : item
        );
        setOutline(updatedOutline);

        if (!projectId) return;

        const payload: Record<string, unknown> = { outline: updatedOutline };

        // If slides already exist, clear the matching slide so the editor regenerates it.
        const existingSlides = projectDetail?.slides;
        if (
            slideIndex >= 0 &&
            Array.isArray(existingSlides) &&
            existingSlides.length > slideIndex
        ) {
            const updatedSlides = [...existingSlides];
            updatedSlides[slideIndex] = { code: '' };
            payload.slides = updatedSlides;
            setProjectDetail((prev) =>
                prev ? { ...prev, outline: updatedOutline, slides: updatedSlides } : prev
            );
        }

        await setDoc(doc(fireBaseDb, 'projects', projectId), payload, {
            merge: true,
        });
    }

    const onGenerateSlides = async () => {
      setOpenAlert(true);
      if(userDetail?.credits<=0 && !hasUnlimitedAccess) {
        return;
      }



      if (!projectId) return;
      setUpdateDbLoading(true);
      try {
        await setDoc(doc(fireBaseDb,'projects',projectId),{
          designStyle:selectedStyle,
          outline:outline
        },{merge:true});
        navigate(`/workspace/project/${projectId}/editor`);

        !hasUnlimitedAccess && await setDoc(doc(fireBaseDb,'users',userDetail?.email??''),
        {
          credits:userDetail?.credits - 1
        },{merge:true});

        !hasUnlimitedAccess && setUserDetail((prev:any)=>({
          ...prev,
          credits:userDetail?.credits - 1
        }));
      } 
      
      finally {
        setUpdateDbLoading(false);
      }
    }


    return (
        <div className='flex justify-center mt-20'>
            <div className='max-w-3xl w-full'>
                <h2 className='text-2xl font-bold'>Settings And Sliders Outline</h2>
                <SliderStyle selectStyle={(value:DesignStyle)=>setSelectedStyle(value)} />
                <OutlineSection loading={loading} outline={outline??[]} 
                handleUpdateOutline={(index:string, value:Outline)=>handleUpdateOutline(index, value)} />
            </div>
            <Button size={'lg'} className='fixed bottom-6 transform left-1/2 -translate-x-1/2'
            onClick={onGenerateSlides}
            disabled={UpdateDbLoading || loading}
            >
              {UpdateDbLoading && <Loader2Icon className='animate-spin' />}
              <ArrowRight/> Generate Slides</Button>

              <CreditLimitDialog openAlert={openAlert} setOpenAlert={setOpenAlert} />
        </div>
    )
}

export default Outline