import React, { useRef } from "react";
import { UserAgent, Registerer, Inviter, Invitation } from "sip.js";

export default function App() {
  const uaRef = useRef(null);
  const registererRef = useRef(null);
  const sessionRef = useRef(null);
  const [logs, setLogs] = React.useState([]);

const log = (msg) => {
  const time = new Date().toLocaleTimeString();
  setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  console.log(msg);
};

  const server = "ws://10.255.110.61:8088/ws";

  async function startPhone() {

    const uri = UserAgent.makeURI("sip:12345@10.255.110.61");

    const userAgent = new UserAgent({
      uri,
      transportOptions: {
        server
      },
      authorizationUsername: "12345",
      authorizationPassword: "abc123"
    });

    uaRef.current = userAgent;

    // ⭐⭐⭐ INCOMING CALL HANDLER ⭐⭐⭐
    userAgent.delegate = {
      onInvite: async (invitation) => {
        log("Incoming call!");

        sessionRef.current = invitation;

        // attach audio later
        const remoteAudio = document.getElementById("remoteAudio");

        invitation.stateChange.addListener((state) => {
          log(`Call state:${state}`);

          if (state === "Established") {
            const sdh = invitation.sessionDescriptionHandler;
            const pc = sdh.peerConnection;

            pc.getReceivers().forEach((receiver) => {
              if (receiver.track && receiver.track.kind === "audio") {
                const stream = new MediaStream([receiver.track]);
                remoteAudio.srcObject = stream;
              }
            });
          }
        });

        // auto answer for now
        await invitation.accept();
      }
    };

    await userAgent.start();

    const registerer = new Registerer(userAgent);
    registererRef.current = registerer;

    await registerer.register();
    log("Phone ready!");
  }

    async function makeCall() {
    const target = UserAgent.makeURI("sip:9000@10.255.110.61"); // call another extension

    const inviter = new Inviter(uaRef.current, target);
    sessionRef.current = inviter;

    const remoteAudio = document.getElementById("remoteAudio");

    inviter.stateChange.addListener((state) => {
      log(`Outgoing state:${state}`);

      if (state === "Established") {
        const sdh = inviter.sessionDescriptionHandler;
        const pc = sdh.peerConnection;

        pc.getReceivers().forEach((receiver) => {
          if (receiver.track && receiver.track.kind === "audio") {
            const stream = new MediaStream([receiver.track]);
            remoteAudio.srcObject = stream;
          }
        });
      }
    });

    await inviter.invite();
  }
function hangup() {
  if (!sessionRef.current) return;

  sessionRef.current.bye();
}
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
  <div
    style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f3f6f8",
      flexDirection: "column",
    }}
  >
    <h2>DU Sample React-FreePBX Phone</h2>
    <div
  style={{
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
  }}
>
  {logs.length === 0 && <div>PBX console ready...</div>}
  {logs.map((l, i) => (
    <div key={i}>{l}</div>
  ))}
</div>

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
      

      <button style={btn} onClick={startPhone}>Start Phone</button>
      <button style={btn} onClick={makeCall}>Call Nursing Station</button>
      <button style={btn} onClick={hangup}>Hangup</button>

      <audio id="remoteAudio" autoPlay></audio>
    </div>
  </div>


);

}



 

 


 
