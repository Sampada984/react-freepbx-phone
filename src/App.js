import React, { useRef, useState } from "react";
import { UserAgent, Registerer, Inviter } from "sip.js";

export default function App() {

  const uaRef = useRef(null);
  const registererRef = useRef(null);

  // SIP sessions
  const sessionsRef = useRef(new Map());
  const activeSessionRef = useRef(null);

  // UI state
  const [calls, setCalls] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dialNumber, setDialNumber] = useState("");

  const server = "wss://test2-localedge:8089/ws";

  const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    console.log(msg);
  };


  function attachAudio(session) {
    const remoteAudio = document.getElementById("remoteAudio");
    const sdh = session.sessionDescriptionHandler;
    if (!sdh) return;

    const pc = sdh.peerConnection;

    pc.getReceivers().forEach(receiver => {
      if (receiver.track && receiver.track.kind === "audio") {
        const stream = new MediaStream([receiver.track]);
        remoteAudio.srcObject = stream;
      }
    });
  }

  function updateCallState(id, newState) {
    setCalls(prev =>
      prev.map(c => c.id === id ? { ...c, state: newState } : c)
    );
  }

  function addCall(session, direction) {
    const call = {
      id: session.id,
      session,
      direction,
      state: "Ringing"
    };

    sessionsRef.current.set(session.id, session);
    setCalls(prev => [...prev, call]);
  }

  function removeCall(session) {
    sessionsRef.current.delete(session.id);
    setCalls(prev => prev.filter(c => c.id !== session.id));

    if (activeSessionRef.current === session)
      activeSessionRef.current = null;
  }

  /* ----------------------- HOLD ---------------------- */

  async function holdCall(session) {
    log("Putting call on hold");

    await session.invite({
      sessionDescriptionHandlerModifiers: [
        (description) => {
          description.sdp = description.sdp.replace(/a=sendrecv/g, "a=sendonly");
          return Promise.resolve(description);
        }
      ]
    });

    updateCallState(session.id, "On Hold");
  }

  async function resumeCall(session) {

    if (activeSessionRef.current && activeSessionRef.current !== session) {
      await holdCall(activeSessionRef.current);
    }

    await session.invite({
      sessionDescriptionHandlerModifiers: [
        (description) => {
          description.sdp = description.sdp.replace(/a=sendonly|a=inactive/g, "a=sendrecv");
          return Promise.resolve(description);
        }
      ]
    });

    activeSessionRef.current = session;
    attachAudio(session);
    updateCallState(session.id, "Active");
  }

  /* ----------------------- START PHONE ---------------------- */

  async function startPhone() {

    const uri = UserAgent.makeURI("sip:9000@test2-localedge");

    const userAgent = new UserAgent({
      uri,
      transportOptions: { server },
      authorizationUsername: "9000",
      authorizationPassword: "abc123"
    });

    uaRef.current = userAgent;

    userAgent.delegate = {
      onInvite: (invitation) => {

        log("Incoming call");

        addCall(invitation, "incoming");

        invitation.stateChange.addListener((state) => {

          log(`Incoming: ${state}`);

          if (state === "Established") {
            activeSessionRef.current = invitation;
            attachAudio(invitation);
            updateCallState(invitation.id, "Active");
          }

          if (state === "Terminated") {
            removeCall(invitation);
          }
        });
      }
    };

    await userAgent.start();

    const registerer = new Registerer(userAgent);
    registererRef.current = registerer;

    await registerer.register();

    log("Registered to PBX");
  }

  /* ----------------------- ANSWER ---------------------- */

  async function answerCall(session) {

    if (activeSessionRef.current && activeSessionRef.current !== session) {
      await holdCall(activeSessionRef.current);
    }

    await session.accept();
  }

 async function makeCall() {

  if (!uaRef.current) {
    log("Phone not started");
    return;
  }

  const number = dialNumber.trim();

  if (!number) {
    log("Enter an extension number");
    return;
  }

  // Build SIP URI (IMPORTANT: extension based, not IP)
  const target = UserAgent.makeURI(`sip:${number}@test2-localedge`);

  if (!target) {
    log("Invalid number");
    return;
  }

  log(`Dialing ${number}`);

  const inviter = new Inviter(uaRef.current, target);

  addCall(inviter, "outgoing");

  inviter.stateChange.addListener((state) => {

    log(`Outgoing: ${state}`);

    if (state === "Established") {
      activeSessionRef.current = inviter;
      attachAudio(inviter);
      updateCallState(inviter.id, "Active");
    }

    if (state === "Terminated") {
      removeCall(inviter);
    }
  });

  // Hold existing active call (call waiting behaviour)
  if (activeSessionRef.current) {
    await holdCall(activeSessionRef.current);
  }

  await inviter.invite();
}


  /* ----------------------- HANGUP ---------------------- */

  function hangup(session) {
    if (!session) return;

    if (session.bye) session.bye();
    else session.cancel();
  }

  /* ----------------------- UI ---------------------- */

  const btn = {
  margin: "10px auto",
  width: "220px",
  height: "50px",
  background: "#305565",
  borderRadius: "25px",
  color: "white",
  border: "none",
  display: "block",
  fontSize: "16px",
  cursor: "pointer"
};

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>

      <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
    }}>
      <h2>React WebRTC PBX Phone</h2>
<div
      style={{
        width: "520px",
        padding: "30px",
        background: "white",
        borderRadius: "18px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        textAlign: "center",
        marginTop:"50px"
      }}
    >
      <button style={{...btn, background:"#2e8b57", color:"white"}} onClick={startPhone}>
        Start Phone
      </button>

      <div style={{marginTop:20}}>
  <input
    type="text"
    value={dialNumber}
    placeholder="Enter extension (e.g. 12345)"
    onChange={(e)=>setDialNumber(e.target.value)}
    onKeyDown={(e)=>{
      if(e.key === "Enter") makeCall();
    }}
    style={{
      width:"260px",
      height:"45px",
      fontSize:"18px",
      padding:"10px",
      borderRadius:"12px",
      border:"1px solid #ccc",
      textAlign:"center",
      outline:"none"
    }}
  />

  <button
    style={{...btn, background:"#1976d2"}}
    onClick={makeCall}
  >
    Call
  </button>
</div>

      </div>

      <h3>Active Calls</h3>

      {calls.length === 0 && <div>No active calls</div>}

      {calls.map(call => (
        <div key={call.id}
          style={{
            border:"1px solid #ccc",
            padding:"10px",
            margin:"10px 0",
            borderRadius:"10px"
          }}>

          <div><b>{call.direction.toUpperCase()}</b></div>
          <div>Status: {call.state}</div>

          {call.state === "Ringing" &&
            <button style={{...btn, background:"#2e8b57", color:"white"}}
              onClick={() => answerCall(call.session)}>
              Answer
            </button>
          }

          {call.state === "Active" &&
            <button style={{...btn, background:"#ff9800", color:"white"}}
              onClick={() => holdCall(call.session)}>
              Hold
            </button>
          }

          {call.state === "On Hold" &&
            <button style={{...btn, background:"#1976d2", color:"white"}}
              onClick={() => resumeCall(call.session)}>
              Resume
            </button>
          }

          <button style={{...btn, background:"#c62828", color:"white"}}
            onClick={() => hangup(call.session)}>
            Hangup
          </button>

        </div>
      ))}

      <audio id="remoteAudio" autoPlay></audio>

      <h3>Logs</h3>
      <div  style={{
    width: "520px",
    height: "160px",
    background: "#0f1720",
    color: "#7CFCB2",
    fontFamily: "monospace",
    fontSize: "13px",
    padding: "10px",
    borderRadius: "12px",
    overflowY: "auto",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    marginTop: "15px",
    textAlign: "left"
  }}>
        {logs.map((l,i)=><div key={i}>{l}</div>)}
      </div>
</div>
    </div>
  );
}
