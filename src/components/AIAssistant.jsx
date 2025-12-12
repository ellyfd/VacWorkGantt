import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function AIAssistant({ currentUser, employees, leaveTypes }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: todayLeaves = [] } = useQuery({
    queryKey: ['todayLeaves'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.LeaveRecord.filter({ date: today });
    },
    enabled: isOpen,
  });

  const createLeaveMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
      queryClient.invalidateQueries(['todayLeaves']);
    },
  });

  const getTodaySummary = () => {
    if (todayLeaves.length === 0) return '今天沒有人請假。';
    
    const summary = {};
    todayLeaves.forEach(leave => {
      const emp = employees.find(e => e.id === leave.employee_id);
      const leaveType = leaveTypes.find(lt => lt.id === leave.leave_type_id);
      if (emp && leaveType) {
        if (!summary[leaveType.name]) {
          summary[leaveType.name] = [];
        }
        summary[leaveType.name].push(emp.name);
      }
    });

    let result = `今天共有 ${todayLeaves.length} 人請假：\n\n`;
    Object.keys(summary).forEach(type => {
      result += `【${type}】${summary[type].join('、')}\n`;
    });
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      if (userMessage.includes('統計') || userMessage.includes('今天') || userMessage.includes('人數')) {
        const summary = getTodaySummary();
        setMessages(prev => [...prev, { role: 'assistant', content: summary }]);
      } else {
        const currentEmployee = employees.find(e => e.id === currentUser.employee_id);
        const prompt = `你是一個請假助手。用戶說：「${userMessage}」
        
當前用戶：${currentEmployee?.name || '未知'}
可用假別：${leaveTypes.map(lt => `${lt.name}(${lt.short_name})`).join('、')}

請判斷用戶是否要請假。如果是，請提取：
1. 請假日期（如果沒說明確日期，假設是今天）
2. 假別類型

輸出JSON格式，如果是請假需求：
{"action": "create_leave", "date": "YYYY-MM-DD", "leave_type_name": "假別名稱", "message": "回覆訊息"}

如果不是請假需求或無法理解：
{"action": "reply", "message": "回覆訊息"}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              action: { type: "string" },
              date: { type: "string" },
              leave_type_name: { type: "string" },
              message: { type: "string" }
            },
            required: ["action", "message"]
          }
        });

        if (result.action === 'create_leave' && result.date && result.leave_type_name) {
          const leaveType = leaveTypes.find(lt => 
            lt.name.includes(result.leave_type_name) || result.leave_type_name.includes(lt.name)
          );

          if (leaveType && currentUser.employee_id) {
            await createLeaveMutation.mutateAsync({
              employee_id: currentUser.employee_id,
              date: result.date,
              leave_type_id: leaveType.id
            });
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `已幫您登記 ${format(new Date(result.date), 'MM月dd日', { locale: zhTW })} 的${leaveType.name}。` 
            }]);
          } else {
            setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
          }
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，處理您的請求時發生錯誤。' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
        size="icon"
      >
        <Bot className="w-6 h-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              AI 請假助手
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <p>您好！我可以幫您：</p>
                  <p className="mt-2">• 快速請假（例如：「明天請特休」）</p>
                  <p>• 統計今天請假人數</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入訊息..."
                disabled={isProcessing}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isProcessing || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}