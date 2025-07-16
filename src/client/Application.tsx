import React, { useEffect, useState } from "react";

import {
  Button,
  Checkbox,
  Container,
  Fade,
  FormControlLabel,
  FormGroup,
  Grid,
  Divider,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton
} from "@mui/material";
import {
  Settings,
  Security,
  AutoAwesome,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error,
  Info,
  Speed
} from "@mui/icons-material";

import "./Application.scss";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ flex: 1, display: "flex", flexDirection: "column" }}
    >
      {value === index && children}
    </div>
  );
}

export const Application = () => {
  const [tabValue, setTabValue] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("Ready");

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(["openaiApiKey"]);
      if (result.openaiApiKey) {
        setApiKey(result.openaiApiKey);
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveApiKey = async () => {
    console.log("saveApiKey called with:", apiKey.substring(0, 7) + "...");

    if (!apiKey.trim()) {
      setMessage({ type: "error", text: "Please enter an API key" });
      return;
    }

    if (!apiKey.startsWith("sk-")) {
      setMessage({ type: "error", text: 'Invalid API key format. Should start with "sk-"' });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Saving API key to storage...");
      await chrome.storage.sync.set({ openaiApiKey: apiKey });
      console.log("API key saved to storage successfully");

      // Test the API key
      console.log("Sending message to background script...");
      const response: any = await new Promise((resolve, reject) => {
        // Set a timeout for the message
        const timeout = setTimeout(() => {
          reject(new (Error as any)("Request timeout - the background script took too long to respond"));
        }, 30000); // 30 seconds timeout

        chrome.runtime.sendMessage(
          {
            type: "TEST_API_KEY",
            data: { apiKey }
          },
          (response: any) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
              console.error("Runtime error:", chrome.runtime.lastError);
              reject(new (Error as any)(chrome.runtime.lastError.message || "Runtime error occurred"));
            } else {
              console.log("Response from background script:", response);
              resolve(response);
            }
          }
        );
      });

      if (response && response.success) {
        setMessage({ type: "success", text: "API key saved and verified!" });
        setIsConnected(true);
        console.log("API key verification successful");
      } else {
        const errorMsg = response?.error || "Failed to verify API key";
        console.error("API key verification failed:", errorMsg);
        setMessage({ type: "error", text: errorMsg });
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error in saveApiKey:", error);
      setMessage({ type: "error", text: `Failed to save API key: ${error.message}` });
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearApiKey = async () => {
    try {
      await chrome.storage.sync.remove(["openaiApiKey"]);
      setApiKey("");
      setIsConnected(false);
      setMessage({ type: "info", text: "API key cleared" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to clear API key" });
    }
  };

  const checkConnection = async () => {
    try {
      const result = await chrome.storage.sync.get(["openaiApiKey"]);
      if (result.openaiApiKey) {
        const response = await chrome.runtime.sendMessage({
          type: "TEST_API_KEY",
          data: { apiKey: result.openaiApiKey }
        });
        setIsConnected(response.success);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const testGeneration = async () => {
    setIsLoading(true);
    setCurrentStatus("Testing AI generation...");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GENERATE_PR_DESCRIPTION",
        data: {
          diff: "Test diff content: Added new feature for user authentication",
          template: "## Description\n\n## Changes\n\n## Testing",
          url: "https://github.com/test/repo/compare/main...feature"
        }
      });

      if (response.success) {
        setMessage({ type: "success", text: "AI generation test successful!" });
        setCurrentStatus("Ready");
      } else {
        setMessage({ type: "error", text: response.error || "Test failed" });
        setCurrentStatus("Error");
      }
    } catch (error) {
      setMessage({ type: "error", text: "Test generation failed" });
      setCurrentStatus("Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
    if (message) setMessage(null);
  };

  return (
    <Container sx={{ width: "100%", p: 0, m: 0 }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "grey.50",
            minHeight: 72
          }}
        >
          <img src="/images/icon/48.png" alt="PR Checklist Bot" style={{ width: 32, height: 32, borderRadius: 4 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
            AI PR Assistant
          </Typography>
        </Box>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            bgcolor: "background.paper",
            "& .MuiTab-root": {
              minHeight: 48,
              textTransform: "none",
              fontWeight: 500,
              color: "text.secondary",
              "&.Mui-selected": {
                color: "primary.main",
                fontWeight: 600
              }
            },
            "& .MuiTabs-indicator": {
              height: 2,
              borderRadius: 1
            }
          }}
        >
          <Tab icon={<Settings />} label="Settings" iconPosition="start" />
          <Tab icon={<Speed />} label="Status" iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            flex: 1,
            overflow: "auto"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Security color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              OpenAI Configuration
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="OpenAI API Key"
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="sk-..."
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                  edge="end"
                  size="small"
                >
                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )
            }}
          />

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.200"
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <Info sx={{ fontSize: 16 }} />
              Your API key is stored locally and only used for generating PR descriptions.
            </Typography>
            <Typography variant="body2">
              Get your key from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1976d2", textDecoration: "none" }}
              >
                OpenAI Platform
              </a>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={saveApiKey}
              disabled={isLoading || !apiKey.trim()}
              fullWidth
              sx={{
                textTransform: "none",
                fontWeight: 500
              }}
              startIcon={
                isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle sx={{ fontSize: 16 }} />
              }
            >
              {isLoading ? "Verifying..." : "Save & Verify"}
            </Button>

            {apiKey && (
              <Button
                variant="outlined"
                onClick={clearApiKey}
                disabled={isLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  minWidth: 80
                }}
              >
                Clear
              </Button>
            )}
          </Box>

          {message && (
            <Alert severity={message.type} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            flex: 1,
            overflow: "auto"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Speed color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              Extension Status
            </Typography>
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  API Connection
                </Typography>
                {isConnected ? (
                  <CheckCircle color="success" sx={{ fontSize: 20 }} />
                ) : (
                  <Error color="error" sx={{ fontSize: 20 }} />
                )}
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: isConnected ? "success.main" : "error.main" }}
              >
                {isConnected ? "Connected & Ready" : "Not Connected"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isConnected
                  ? "Your OpenAI API key is working correctly"
                  : "Please configure your OpenAI API key in Settings"}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                Current Status
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {currentStatus}
                </Typography>
                {isLoading && <CircularProgress size={16} />}
              </Box>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            onClick={testGeneration}
            disabled={!isConnected || isLoading}
            fullWidth
            sx={{
              textTransform: "none",
              fontWeight: 500
            }}
            startIcon={<AutoAwesome />}
          >
            Test AI Generation
          </Button>

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.200"
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: "text.primary" }}>
              How to Use:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Navigate to a GitHub PR compare page and look for the "AI Auto-fill" button near the description field to
              use the extension.
            </Typography>
          </Box>

          {message && (
            <Alert severity={message.type} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
        </Box>
      </TabPanel>
    </Container>
  );
};
