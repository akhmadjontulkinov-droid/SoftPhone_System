import { useState, useEffect } from 'react';
import { Phone, ChevronDown, Mic, MicOff, Pause, Play, PhoneOff, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface CallLog {
  id: string;
  phone_number: string;
  start_time: string;
  duration: string;
  status: string;
  call_status: string;
}

type StatusType = 'Available' | 'Break' | 'Lunch' | 'Personal Time' | 'Tech Issues' | 'Gone Home' | 'After Call Work' | 'On Call' | 'Out Bound';

function App() {
  const [agentName] = useState('Akhmadjon Tulkinov');
  const [currentStatus, setCurrentStatus] = useState<StatusType>('Available');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [statusTimer, setStatusTimer] = useState(0);
  const [statusTimers, setStatusTimers] = useState<Record<StatusType, number>>({
    'Available': 0,
    'Break': 0,
    'Lunch': 0,
    'Personal Time': 0,
    'Tech Issues': 0,
    'Gone Home': 0,
    'After Call Work': 0,
    'On Call': 0,
    'Out Bound': 0
  });
  const [statusBeforeCall, setStatusBeforeCall] = useState<StatusType>('Available');
  const [dialerNumber, setDialerNumber] = useState('');
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadCallLogs();
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
      setStatusTimer(prev => prev + 1);
      setStatusTimers(prev => ({
        ...prev,
        [currentStatus]: prev[currentStatus] + 1
      }));
      if (activeCall) {
        setCallDuration(prev => prev + 1);
      }
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStatus, activeCall]);

  useEffect(() => {
    if (currentStatus === 'Available' && !incomingCall && !activeCall) {
      const callTimeout = setTimeout(() => {
        setIncomingCall('+1 234-567-8900');
      }, 3000);

      return () => clearTimeout(callTimeout);
    }
  }, [currentStatus, incomingCall, activeCall]);

  useEffect(() => {
    setStatusTimer(0);
  }, [currentStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showStatusDropdown || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown, showUserMenu]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (activeCall) return;

      const key = e.key;
      if (/^[0-9*#]$/.test(key)) {
        setDialerNumber(prev => prev + key);
      } else if (key === 'Backspace') {
        setDialerNumber(prev => prev.slice(0, -1));
      } else if (key === 'Enter' && dialerNumber) {
        handleDialerCall();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [dialerNumber, activeCall]);

  const loadCallLogs = async () => {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(15);

    if (data && !error) {
      setCallLogs(data);
    }
  };

  const handleAnswer = async () => {
    if (incomingCall) {
      const startTime = new Date().toISOString();
      await supabase.from('call_logs').insert({
        phone_number: incomingCall,
        start_time: startTime,
        duration: '00:00',
        status: 'inbound',
        call_status: 'answered'
      });
      setStatusBeforeCall(currentStatus);
      setCurrentStatus('On Call');
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallDuration(0);
      loadCallLogs();
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      const duration = formatTime(callDuration);
      const { data } = await supabase
        .from('call_logs')
        .select('*')
        .eq('phone_number', activeCall)
        .in('status', ['inbound', 'outbound'])
        .order('start_time', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        await supabase
          .from('call_logs')
          .update({ duration })
          .eq('id', data[0].id);
      }

      setActiveCall(null);
      setCallDuration(0);
      setIsMuted(false);
      setIsOnHold(false);
      setCurrentStatus('After Call Work');
      loadCallLogs();
    }
  };

  const handleDecline = async () => {
    if (incomingCall) {
      const startTime = new Date().toISOString();
      await supabase.from('call_logs').insert({
        phone_number: incomingCall,
        start_time: startTime,
        duration: '00:00',
        status: 'inbound',
        call_status: 'declined'
      });
      setIncomingCall(null);
      loadCallLogs();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const statusOptions: StatusType[] = ['Available', 'Break', 'Lunch', 'Personal Time', 'Tech Issues', 'Gone Home', 'After Call Work', 'Out Bound'];

  const getStatusColor = (status: StatusType) => {
    if (status === 'Available') return 'bg-green-500';
    if (status === 'Tech Issues') return 'bg-red-500';
    if (status === 'On Call') return 'bg-blue-600';
    if (status === 'Out Bound') return 'bg-blue-500';
    return 'bg-orange-500';
  };

  const getStatusTextColor = (status: StatusType) => {
    if (status === 'Available') return 'text-green-600';
    if (status === 'Break') return 'text-blue-600';
    if (status === 'Lunch') return 'text-orange-500';
    if (status === 'Personal Time') return 'text-orange-600';
    if (status === 'Tech Issues') return 'text-red-600';
    if (status === 'Gone Home') return 'text-gray-600';
    if (status === 'After Call Work') return 'text-blue-500';
    if (status === 'On Call') return 'text-blue-600';
    if (status === 'Out Bound') return 'text-blue-500';
    return 'text-gray-600';
  };

  const getTimeInZone = (timezone: string) => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleDialerCall = async () => {
    if (dialerNumber && !activeCall) {
      const startTime = new Date().toISOString();
      await supabase.from('call_logs').insert({
        phone_number: dialerNumber,
        start_time: startTime,
        duration: '00:00',
        status: 'outbound',
        call_status: 'answered'
      });
      setStatusBeforeCall(currentStatus);
      setCurrentStatus('On Call');
      setActiveCall(dialerNumber);
      setDialerNumber('');
      setCallDuration(0);
      loadCallLogs();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-12 py-8 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          <div className="flex items-center gap-20">
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700">EST</div>
              <div className="text-lg font-mono">{getTimeInZone('America/New_York')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700">CST</div>
              <div className="text-lg font-mono">{getTimeInZone('America/Chicago')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700">MST</div>
              <div className="text-lg font-mono">{getTimeInZone('America/Denver')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700">PST</div>
              <div className="text-lg font-mono">{getTimeInZone('America/Los_Angeles')}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">SoftPhone System</h1>
          </div>

          <div className="relative user-menu-container">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
              <span className="text-lg font-medium">{agentName}</span>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-semibold">
                A
              </div>
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-50">
                <button
                  onClick={() => {
                    if (currentStatus === 'Gone Home') {
                      setShowUserMenu(false);
                      alert('Signed out');
                    }
                  }}
                  disabled={currentStatus !== 'Gone Home'}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-12 py-8">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-8">Interactions</h2>

              {incomingCall && !activeCall && (
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center mb-6">
                  <h3 className="text-3xl font-semibold mb-4">{incomingCall}</h3>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleDecline}
                      className="px-6 py-3 bg-red-500 text-white text-lg font-medium rounded-xl hover:bg-red-600 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={handleAnswer}
                      className="px-6 py-3 bg-green-500 text-white text-lg font-medium rounded-xl hover:bg-green-600 transition-colors"
                    >
                      Answer
                    </button>
                  </div>
                </div>
              )}

              {activeCall && (
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-6">
                  <div className="text-center mb-4">
                    <h3 className="text-3xl font-semibold mb-2">{activeCall}</h3>
                    <p className="text-2xl text-gray-600">{formatTime(callDuration)}</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-4 rounded-xl transition-colors ${
                        isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => setIsOnHold(!isOnHold)}
                      className={`p-4 rounded-xl transition-colors ${
                        isOnHold ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isOnHold ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={handleEndCall}
                      className="p-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              <h2 className="text-3xl font-bold mb-6 mt-8">Activity Log</h2>

              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="text-sm font-semibold text-gray-600 uppercase">Phone Number</div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Call Type</div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Time Received</div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Call Status</div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Call Duration</div>
                </div>
                <div className="divide-y divide-gray-200">
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-base font-medium text-gray-900">{log.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.status === 'outbound' ? (
                          <PhoneOutgoing className="w-4 h-4 text-blue-500" />
                        ) : (
                          <PhoneIncoming className="w-4 h-4 text-green-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          log.status === 'outbound' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {log.status === 'outbound' ? 'Outbound' : 'Inbound'}
                        </span>
                      </div>
                      <div className="text-base text-gray-600">{formatTimestamp(log.start_time)}</div>
                      <div className="flex items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          log.call_status === 'answered'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.call_status === 'answered' ? 'Answered' : 'Declined'}
                        </span>
                      </div>
                      <div className="text-base font-medium text-gray-900">{log.duration}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-80 space-y-4">
              <div className="relative status-dropdown-container">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={`w-full px-6 py-4 text-white text-xl font-medium rounded-xl transition-colors flex items-center justify-between ${
                    currentStatus === 'Available' ? 'bg-green-500 hover:bg-green-600' :
                    currentStatus === 'Tech Issues' ? 'bg-red-500 hover:bg-red-600' :
                    currentStatus === 'On Call' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{currentStatus}</span>
                    <span className="text-base opacity-90">{formatTime(statusTimer)}</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg z-10">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setCurrentStatus(status);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full px-6 py-4 text-left text-lg font-medium transition-colors ${
                          status === 'Available'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : status === 'Tech Issues'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : `${getStatusTextColor(status)} hover:bg-gray-50`
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-center">Dialer</h3>
                <div className="mb-4">
                  <input
                    type="text"
                    value={dialerNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9*#+\-() ]*$/.test(value)) {
                        setDialerNumber(value);
                      }
                    }}
                    className="w-full px-4 py-3 text-xl text-center border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="Enter number"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                    <button
                      key={digit}
                      onClick={() => setDialerNumber(prev => prev + digit)}
                      className="py-3 bg-gray-100 hover:bg-gray-200 text-xl font-semibold rounded-lg transition-colors"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setDialerNumber('')}
                    className="py-3 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleDialerCall}
                    className="py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!dialerNumber || !!activeCall}
                  >
                    Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;