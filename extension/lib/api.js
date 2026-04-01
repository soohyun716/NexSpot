export async function requestGuide({ userRequest, url, title }) {
	const response = await fetch("http://localhost:4000/api/guide", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			userRequest,
			url,
			title
		})
	});

	const data = await response.json().catch(() => null);

	if (!response.ok) {
	  throw new Error(data?.reason || data?.error || `HTTP ${response.status}`);
	}
  
	return data;
  }